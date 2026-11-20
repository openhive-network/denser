import type { PasskeyUnlockRecord } from '@smart-signer/lib/passkey-unlock/passkey-unlock-ceremony';

// hb-auth's store of passkey unlocks: its `hasPasskey`, `removePasskey` and `biometricUnlock` read
// the records this one writes, so the database, its version and the store are hb-auth's own
const DB_NAME = '/passkeys_v3';
const DB_VERSION = 1;
const STORE_NAME = 'credentials';

function settled<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openStore(): Promise<IDBDatabase> {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'username' });
    }
  };
  return settled(request);
}

/** Resolves once `transaction` commits: a request's success does not mean its write is stored */
function committed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new DOMException('Transaction aborted', 'AbortError'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openStore();
  try {
    const transaction = db.transaction(STORE_NAME, mode);
    const done = committed(transaction);
    const [result] = await Promise.all([settled(run(transaction.objectStore(STORE_NAME))), done]);
    return result;
  } finally {
    db.close();
  }
}

/** The passkey unlock of `username`; null when there is none */
export async function readPasskeyUnlock(username: string): Promise<PasskeyUnlockRecord | null> {
  const record: PasskeyUnlockRecord | undefined = await withStore('readonly', (store) => store.get(username));
  return record ?? null;
}

/** Stores `record`, in place of the passkey unlock its user had; resolves once it is stored */
export async function storePasskeyUnlock(record: PasskeyUnlockRecord): Promise<void> {
  await withStore('readwrite', (store) => store.put(record));
}

/** Removes the passkey unlock of `username`, as hb-auth's `removePasskey` does; resolves once removed */
export async function removePasskeyUnlock(username: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(username));
}
