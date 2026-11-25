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

// The PRF salt every record of this device is encrypted under, in a database of its own: a store
// added to hb-auth's would take a version hb-auth's own open of version 1 refuses
const DEVICE_DB_NAME = '/passkeys_v3_device';
const DEVICE_DB_VERSION = 1;
const DEVICE_STORE_NAME = 'device';
const DEVICE_SALT_KEY = 'prfSalt';
const DEVICE_SALT_LENGTH = 32;

function openDatabase(name: string, version: number, storeName: string, keyPath?: string): Promise<IDBDatabase> {
  const request = indexedDB.open(name, version);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(storeName)) {
      request.result.createObjectStore(storeName, keyPath ? { keyPath } : undefined);
    }
  };
  return settled(request);
}

const openStore = () => openDatabase(DB_NAME, DB_VERSION, STORE_NAME, 'username');

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

const isSalt = (value: unknown): value is Uint8Array<ArrayBuffer> =>
  value instanceof Uint8Array && value.length === DEVICE_SALT_LENGTH;

/**
 * The PRF salt every passkey unlock record of this device is to be encrypted under, created on
 * first need: one read-write transaction reads it and stores a new one only where there is none,
 * so two tabs asking at once get the same salt
 */
export async function readDevicePrfSalt(): Promise<Uint8Array<ArrayBuffer>> {
  const db = await openDatabase(DEVICE_DB_NAME, DEVICE_DB_VERSION, DEVICE_STORE_NAME);
  try {
    const transaction = db.transaction(DEVICE_STORE_NAME, 'readwrite');
    const done = committed(transaction);
    const store = transaction.objectStore(DEVICE_STORE_NAME);
    const salt = settled<unknown>(store.get(DEVICE_SALT_KEY)).then((stored) => {
      if (isSalt(stored)) return stored;
      const created = crypto.getRandomValues(new Uint8Array(DEVICE_SALT_LENGTH));
      return settled(store.put(created, DEVICE_SALT_KEY)).then(() => created);
    });
    const [result] = await Promise.all([salt, done]);
    return result;
  } finally {
    db.close();
  }
}
