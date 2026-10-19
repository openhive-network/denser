import { getStorageItem, setStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';

/** How long "Not now" keeps the passkey prompt away */
const PASSKEY_PROMPT_SNOOZE_MS = 8 * 60 * 60 * 1000;

const dismissalKey = (username: string) => `passkey-dismissed-${username}`;

/** "Not now": the offer to enable a passkey comes back to `username` after a few hours. */
export function snoozePasskeyPrompt(username: string): void {
  setStorageItem(dismissalKey(username), 'later', PASSKEY_PROMPT_SNOOZE_MS);
}

/** "Never": the offer to enable a passkey does not come back to `username`. */
export function declinePasskeyPrompt(username: string): void {
  setStorageItem(dismissalKey(username), 'never', StorageTTL.PERMANENT);
}

export function isPasskeyPromptDismissed(username: string): boolean {
  return getStorageItem<string>(dismissalKey(username)) !== null;
}
