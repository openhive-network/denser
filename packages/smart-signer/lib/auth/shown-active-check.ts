import type { OnlineClient } from '@hiveio/hb-auth';

// hb-auth keeps each wallet's setting of the active-key check in this IndexedDB store, keyed by username.
// Its API reads a missing record as on, as it reads a tampered one: only the store tells them apart.
const SETTINGS_DATABASE = '/protected_settings_v3';
const SETTINGS_STORE = 'settings';

/** Whether hb-auth's store holds a setting of `username`; undefined when the store does not exist */
function hasStoredSetting(username: string): Promise<boolean | undefined> {
  return new Promise((resolve, reject) => {
    let missing = false;
    const request = indexedDB.open(SETTINGS_DATABASE);
    // Opening a database that does not exist creates it, without the store hb-auth would then not add
    request.onupgradeneeded = () => {
      missing = true;
      request.transaction?.abort();
    };
    request.onerror = () => (missing ? resolve(undefined) : reject(request.error));
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
        database.close();
        resolve(undefined);
        return;
      }
      const read = database.transaction(SETTINGS_STORE, 'readonly').objectStore(SETTINGS_STORE).getKey(username);
      read.onsuccess = () => resolve(read.result !== undefined);
      read.onerror = () => reject(read.error);
      read.transaction?.addEventListener('complete', () => database.close());
    };
  });
}

/**
 * The setting of the active-key check of `username`'s safe-storage wallet to describe in text, never
 * to sign by: verified in an unlocked wallet; in a locked one as stored, unverified, except that a
 * wallet with no stored setting, one from before the setting, reads off, as its next unlock adopts it.
 * When the store cannot be read, a setting hb-auth reads as on stays on.
 */
export async function readShownActiveCheck(
  client: Pick<OnlineClient, 'getRequireActiveCheck' | 'getRegisteredUserByUsername'>,
  username: string,
  hasSetting: (username: string) => Promise<boolean | undefined> = hasStoredSetting
): Promise<boolean> {
  if (!(await client.getRequireActiveCheck(username))) return false;
  if ((await client.getRegisteredUserByUsername(username))?.unlocked) return true;
  return (await hasSetting(username)) !== false;
}
