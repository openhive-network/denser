import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Under node's type stripping the `@smart-signer/` aliases do not resolve
const MODULES: Record<string, string> = {
  '@smart-signer/lib/signer/credential-storage': new URL('../signer/credential-storage.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const module = MODULES[specifier];
    if (module !== undefined) return { url: module, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { clearHiveAuthSession, readHiveAuthSession, SESSION_EXPIRY_MARGIN_MS, writeHiveAuthSession } = await import(
  './session.ts'
);
const { clearAccountCredentials } = await import('../signer/credential-storage.ts');

/** In-memory `Storage`, as localStorage behaves. */
class StubStorage implements Storage {
  private readonly items = new Map<string, string>();

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

const NOW = 1_800_000_000_000;
const HOUR = 3_600_000;
const session = (username: string, expire = NOW + HOUR) => ({ username, key: `key-${username}`, token: 't', expire });

describe('HiveAuth sessions', () => {
  it("keeps each account's session apart", () => {
    const storage = new StubStorage();
    writeHiveAuthSession(storage, session('alice'));
    writeHiveAuthSession(storage, session('bob', NOW + 2 * HOUR));

    assert.deepEqual(readHiveAuthSession(storage, 'alice', NOW), session('alice'));
    assert.deepEqual(readHiveAuthSession(storage, 'bob', NOW), session('bob', NOW + 2 * HOUR));
    assert.equal(readHiveAuthSession(storage, 'carol', NOW), null);
    assert.equal(storage.getItem('hiveAuthData.alice'), JSON.stringify(session('alice')));
  });

  it('drops a session that has expired, or expires before a request could be answered', () => {
    const storage = new StubStorage();
    writeHiveAuthSession(storage, session('alice', NOW - 1));
    writeHiveAuthSession(storage, session('bob', NOW + SESSION_EXPIRY_MARGIN_MS));
    writeHiveAuthSession(storage, session('carol', NOW + SESSION_EXPIRY_MARGIN_MS + 1));

    assert.equal(readHiveAuthSession(storage, 'alice', NOW), null);
    assert.equal(readHiveAuthSession(storage, 'bob', NOW), null);
    assert.equal(storage.getItem('hiveAuthData.alice'), null);
    assert.equal(storage.getItem('hiveAuthData.bob'), null);
    assert.deepEqual(readHiveAuthSession(storage, 'carol', NOW), session('carol', NOW + SESSION_EXPIRY_MARGIN_MS + 1));
  });

  it('reads an expiry in seconds, as older wallet apps send it, in milliseconds', () => {
    const storage = new StubStorage();
    writeHiveAuthSession(storage, session('alice', (NOW + HOUR) / 1000));
    assert.equal(readHiveAuthSession(storage, 'alice', NOW)?.expire, NOW + HOUR);
    writeHiveAuthSession(storage, session('bob', (NOW - HOUR) / 1000));
    assert.equal(readHiveAuthSession(storage, 'bob', NOW), null);
  });

  it("drops an unreadable session, or one stored under the account that is another's", () => {
    const storage = new StubStorage();
    storage.setItem('hiveAuthData.alice', '{not json');
    storage.setItem('hiveAuthData.bob', JSON.stringify({ username: 'bob', token: '', expire: NOW + HOUR }));
    storage.setItem('hiveAuthData.carol', JSON.stringify(session('mallory')));

    for (const username of ['alice', 'bob', 'carol']) {
      assert.equal(readHiveAuthSession(storage, username, NOW), null, username);
      assert.equal(storage.getItem(`hiveAuthData.${username}`), null, username);
    }
  });

  it('takes over the entry all accounts shared only for the account it belongs to', () => {
    const storage = new StubStorage();
    storage.setItem('hiveAuthData', JSON.stringify(session('alice')));

    assert.equal(readHiveAuthSession(storage, 'bob', NOW), null);
    assert.equal(storage.getItem('hiveAuthData'), JSON.stringify(session('alice')));
    assert.deepEqual(readHiveAuthSession(storage, 'alice', NOW), session('alice'));
    assert.equal(storage.getItem('hiveAuthData'), null);
  });

  it("is cleared for one account on its sign-out, and with the account's other credentials on removal", () => {
    const storage = new StubStorage();
    writeHiveAuthSession(storage, session('alice'));
    writeHiveAuthSession(storage, session('bob'));

    clearHiveAuthSession(storage, 'alice');
    assert.equal(readHiveAuthSession(storage, 'alice', NOW), null);
    clearAccountCredentials(storage, 'bob');
    assert.equal(readHiveAuthSession(storage, 'bob', NOW), null);
  });
});
