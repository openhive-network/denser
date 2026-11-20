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

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openStore();
  try {
    return await settled(run(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME)));
  } finally {
    db.close();
  }
}

/** The passkey unlock of `username`; null when there is none */
export async function readPasskeyUnlock(username: string): Promise<PasskeyUnlockRecord | null> {
  const record: PasskeyUnlockRecord | undefined = await withStore('readonly', (store) => store.get(username));
  return record ?? null;
}

/** Stores `record`, in place of the passkey unlock its user had */
export async function storePasskeyUnlock(record: PasskeyUnlockRecord): Promise<void> {
  await withStore('readwrite', (store) => store.put(record));
}
