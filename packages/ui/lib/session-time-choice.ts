import { configuredSessionTime } from '@hive/ui/config/public-vars';
import { resolveChosenSessionTime, sessionTimeChoices } from '@hive/ui/lib/session-time';
import { getStorageItem, StorageTTL } from '@hive/ui/lib/storage-with-ttl';
import { setStorageItemAndNotify } from '@hive/ui/lib/storage-with-ttl-notify';

/** The idle lock, in seconds, the user chose; kept per browser, so every app of the origin uses it */
export const SESSION_TIME_CHOICE_KEY = 'safe-storage-session-time';

/** The idle times, in seconds and ascending, the user may choose from */
export const getSessionTimeChoices = (): number[] => sessionTimeChoices(configuredSessionTime);

/**
 * The idle time, in seconds, after which a safe-storage session locks: the user's choice while the
 * deployment still offers it, else the deployment's value.
 */
export const getSessionTime = (): number =>
  resolveChosenSessionTime(configuredSessionTime, getStorageItem<unknown>(SESSION_TIME_CHOICE_KEY));

/**
 * Stores `seconds` as the user's idle lock, telling this tab's listeners too. Workers already running
 * keep theirs: each app's next safe-storage client starts a worker that locks after `seconds`.
 */
export function chooseSessionTime(seconds: number): void {
  setStorageItemAndNotify(SESSION_TIME_CHOICE_KEY, seconds, StorageTTL.PERMANENT);
}
