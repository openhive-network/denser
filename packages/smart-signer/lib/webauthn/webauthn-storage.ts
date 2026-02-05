/**
 * IndexedDB storage for biometric credentials.
 *
 * Stores encrypted WIF keys and associated metadata.
 * Each user can have one biometric credential for Google Drive wallet.
 */

import { getLogger } from '@hive/ui/lib/logging';
import type { BiometricCredential } from './webauthn-types';
import { base64ToUint8Array, uint8ArrayToBase64 } from './webauthn-crypto';

const logger = getLogger('webauthn-storage');

const DB_NAME = 'denser-biometric-auth';
const DB_VERSION = 1;
const STORE_NAME = 'credentials';

/**
 * Serialized form of BiometricCredential for IndexedDB storage.
 * Uint8Arrays are converted to base64 strings for storage.
 */
interface StoredCredential {
  credentialId: string;
  username: string;
  encryptedWif: string; // base64
  salt: string; // base64
  iv: string; // base64
  createdAt: number;
  lastUsedAt: number;
}

/**
 * Opens the IndexedDB database, creating it if necessary.
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      logger.error('Failed to open IndexedDB: %o', request.error);
      reject(new Error('Failed to open biometric credentials database'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store with username as key path
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'username' });
        // Create index on credentialId for lookups
        store.createIndex('credentialId', 'credentialId', { unique: true });
        logger.info('Created biometric credentials store');
      }
    };
  });
}

/**
 * Converts a BiometricCredential to storage format.
 */
function toStoredCredential(credential: BiometricCredential): StoredCredential {
  return {
    credentialId: credential.credentialId,
    username: credential.username,
    encryptedWif: uint8ArrayToBase64(credential.encryptedWif),
    salt: uint8ArrayToBase64(credential.salt),
    iv: uint8ArrayToBase64(credential.iv),
    createdAt: credential.createdAt,
    lastUsedAt: credential.lastUsedAt
  };
}

/**
 * Converts a stored credential back to BiometricCredential.
 */
function fromStoredCredential(stored: StoredCredential): BiometricCredential {
  return {
    credentialId: stored.credentialId,
    username: stored.username,
    encryptedWif: base64ToUint8Array(stored.encryptedWif),
    salt: base64ToUint8Array(stored.salt),
    iv: base64ToUint8Array(stored.iv),
    createdAt: stored.createdAt,
    lastUsedAt: stored.lastUsedAt
  };
}

/**
 * Saves a biometric credential to IndexedDB.
 * Overwrites any existing credential for the same username.
 */
export async function saveCredential(credential: BiometricCredential): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const storedCredential = toStoredCredential(credential);
    const request = store.put(storedCredential);

    request.onerror = () => {
      logger.error('Failed to save credential: %o', request.error);
      reject(new Error('Failed to save biometric credential'));
    };

    request.onsuccess = () => {
      logger.info('Saved biometric credential for user: %s', credential.username);
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Retrieves a biometric credential for a username.
 * Returns null if no credential exists.
 */
export async function getCredentialForUser(username: string): Promise<BiometricCredential | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(username);

    request.onerror = () => {
      logger.error('Failed to get credential: %o', request.error);
      reject(new Error('Failed to get biometric credential'));
    };

    request.onsuccess = () => {
      const stored = request.result as StoredCredential | undefined;
      if (stored) {
        logger.info('Found biometric credential for user: %s', username);
        resolve(fromStoredCredential(stored));
      } else {
        logger.info('No biometric credential found for user: %s', username);
        resolve(null);
      }
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Retrieves a biometric credential by credential ID.
 * Returns null if no credential exists.
 */
export async function getCredentialById(credentialId: string): Promise<BiometricCredential | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('credentialId');
    const request = index.get(credentialId);

    request.onerror = () => {
      logger.error('Failed to get credential by ID: %o', request.error);
      reject(new Error('Failed to get biometric credential'));
    };

    request.onsuccess = () => {
      const stored = request.result as StoredCredential | undefined;
      if (stored) {
        resolve(fromStoredCredential(stored));
      } else {
        resolve(null);
      }
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Updates the lastUsedAt timestamp for a credential.
 */
export async function updateLastUsed(username: string): Promise<void> {
  const credential = await getCredentialForUser(username);
  if (credential) {
    credential.lastUsedAt = Date.now();
    await saveCredential(credential);
  }
}

/**
 * Deletes a biometric credential for a username.
 */
export async function deleteCredentialForUser(username: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(username);

    request.onerror = () => {
      logger.error('Failed to delete credential: %o', request.error);
      reject(new Error('Failed to delete biometric credential'));
    };

    request.onsuccess = () => {
      logger.info('Deleted biometric credential for user: %s', username);
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Deletes all biometric credentials.
 * Use when user logs out or wants to clear all biometric data.
 */
export async function deleteAllCredentials(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => {
      logger.error('Failed to clear credentials: %o', request.error);
      reject(new Error('Failed to clear biometric credentials'));
    };

    request.onsuccess = () => {
      logger.info('Cleared all biometric credentials');
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Checks if IndexedDB is available in the current browser.
 */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}
