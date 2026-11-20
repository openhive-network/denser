import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';

const { readPasskeyUnlock, removePasskeyUnlock, storePasskeyUnlock } = await import('./passkey-unlock-store.ts');
type PasskeyUnlockRecord = Parameters<typeof storePasskeyUnlock>[0];

type Handler = (() => void) | null;

/** A request of the stand-in: its handlers run on a later turn, as IndexedDB's do */
class FakeRequest {
  result: unknown;
  error: DOMException | null = null;
  onsuccess: Handler = null;
  onerror: Handler = null;
  onupgradeneeded: Handler = null;

  succeed(result: unknown) {
    this.result = result;
    setImmediate(() => this.onsuccess?.());
  }
}

/**
 * IndexedDB in memory, holding every readwrite transaction open until the test commits or aborts
 * it: a request succeeds at once, its write is stored only at `complete`
 */
function fakeIndexedDB() {
  const records = new Map<string, unknown>();
  const open: { complete(): void; abort(): void }[] = [];

  function transaction(mode: IDBTransactionMode) {
    const writes: (() => void)[] = [];
    const tx = {
      error: null as DOMException | null,
      oncomplete: null as Handler,
      onerror: null as Handler,
      onabort: null as Handler,
      objectStore: () => ({
        get: (key: string) => {
          const request = new FakeRequest();
          request.succeed(records.get(key));
          return request;
        },
        put: (value: { username: string }) => {
          writes.push(() => records.set(value.username, value));
          const request = new FakeRequest();
          request.succeed(value.username);
          return request;
        },
        delete: (key: string) => {
          writes.push(() => records.delete(key));
          const request = new FakeRequest();
          request.succeed(undefined);
          return request;
        }
      })
    };
    const complete = () => {
      writes.forEach((write) => write());
      tx.oncomplete?.();
    };
    if (mode === 'readonly') setImmediate(complete);
    else {
      open.push({
        complete,
        abort: () => {
          tx.error = new DOMException('Quota exceeded', 'QuotaExceededError');
          tx.onabort?.();
        }
      });
    }
    return tx;
  }

  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => undefined,
    transaction: (_store: string, mode: IDBTransactionMode) => transaction(mode),
    close: () => undefined
  };
  const indexedDB = {
    open: () => {
      const request = new FakeRequest();
      request.succeed(db);
      return request;
    }
  };
  return { indexedDB, records, open };
}

/** The readwrite transaction the store has opened, once it has */
async function openTransaction(open: ReturnType<typeof fakeIndexedDB>['open']) {
  while (open.length === 0) await nextTurn();
  const transaction = open.shift();
  assert.ok(transaction);
  return transaction;
}

const RECORD = {
  username: 'guest4test2',
  credentialId: new Uint8Array([1]),
  prfSalt: new Uint8Array([2]),
  encryptedPassword: new Uint8Array([3]),
  iv: new Uint8Array([4]),
  rpId: 'wallet.example',
  createdAt: 0
} satisfies PasskeyUnlockRecord;

describe('passkey unlock store', () => {
  it('resolves a write only once its transaction completes, and reads it back', async () => {
    const fake = fakeIndexedDB();
    Object.assign(globalThis, { indexedDB: fake.indexedDB });
    let stored = false;

    const writing = storePasskeyUnlock(RECORD).then(() => {
      stored = true;
    });
    const transaction = await openTransaction(fake.open);
    for (let turn = 0; turn < 5; turn++) await nextTurn();
    assert.equal(stored, false);

    transaction.complete();
    await writing;
    assert.equal(stored, true);
    assert.deepEqual(await readPasskeyUnlock(RECORD.username), RECORD);
  });

  it('rejects a write whose transaction aborts after the request succeeded', async () => {
    const fake = fakeIndexedDB();
    Object.assign(globalThis, { indexedDB: fake.indexedDB });

    const writing = storePasskeyUnlock(RECORD);
    (await openTransaction(fake.open)).abort();

    await assert.rejects(writing, { name: 'QuotaExceededError' });
    assert.equal(fake.records.size, 0);
  });

  it('removes a record once its transaction completes', async () => {
    const fake = fakeIndexedDB();
    Object.assign(globalThis, { indexedDB: fake.indexedDB });
    fake.records.set(RECORD.username, RECORD);

    const removing = removePasskeyUnlock(RECORD.username);
    (await openTransaction(fake.open)).complete();
    await removing;

    assert.equal(await readPasskeyUnlock(RECORD.username), null);
  });
});
