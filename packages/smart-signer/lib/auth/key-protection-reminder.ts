import { getStorageItem, setStorageItem } from '@ui/lib/storage-with-ttl';

const REMINDER_KEY_PREFIX = 'keyProtectionSnoozed.';
/** After "Not now", the "saved unprotected" dialog is shown again at most once a day */
const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Put off asking to protect the plaintext keys of `username` for a day. */
export function snoozeKeyProtection(username: string): void {
  setStorageItem(`${REMINDER_KEY_PREFIX}${username}`, true, REMINDER_INTERVAL_MS);
}

/** Whether asking to protect the plaintext keys of `username` is put off. */
export function isKeyProtectionSnoozed(username: string): boolean {
  return getStorageItem<boolean>(`${REMINDER_KEY_PREFIX}${username}`) === true;
}
