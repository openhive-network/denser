import { getStorageItem, removeStorageItem, setStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';

/**
 * Sign-ins in a row whose passkey request failed for an account linked on this device, from which
 * the sign-in form offers to turn the unlock off or set it up again. Only a failure after the
 * account's passkey was picked or named counts: the browser answers a passkey it no longer reaches
 * as it does a cancel, which neither counts nor removes the record.
 */
export const FAILED_UNLOCKS_BEFORE_NOTICE = 2;

const failuresKey = (username: string) => `passkey-unlock-failures-${username}`;

/** The sign-ins in a row whose passkey request for `username` failed; kept across page loads */
export function passkeyUnlockFailures(username: string): number {
  const stored = getStorageItem<unknown>(failuresKey(username));
  return typeof stored === 'number' ? stored : 0;
}

/** Counts one more failed passkey request of `username`'s sign-in, and returns the count */
export function countPasskeyUnlockFailure(username: string): number {
  const failures = passkeyUnlockFailures(username) + 1;
  setStorageItem(failuresKey(username), failures, StorageTTL.UI_STATE);
  return failures;
}

/** The passkey unlocked `username`, or its record was replaced or removed: the count starts over */
export function clearPasskeyUnlockFailures(username: string): void {
  removeStorageItem(failuresKey(username));
}
