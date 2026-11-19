import { getStorageItem, removeStorageItem, setStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';
import { LoginType } from '@smart-signer/types/common';

const LAST_SAFE_STORAGE_USER_KEY = 'lastSafeStorageUser';

/** The account whose last sign-in on this device was with safe storage; empty when there is none */
export function getLastSafeStorageUser(): string {
  const stored = getStorageItem<unknown>(LAST_SAFE_STORAGE_USER_KEY);
  return typeof stored === 'string' ? stored : '';
}

/**
 * Records that `username` signed in with `loginType`: with safe storage it becomes the account the
 * safe storage form offers next; with any other method it stops being that account.
 */
export function recordSignInMethod(username: string, loginType: LoginType): void {
  if (loginType === LoginType.hbauth) setStorageItem(LAST_SAFE_STORAGE_USER_KEY, username, StorageTTL.PERMANENT);
  else if (getLastSafeStorageUser() === username) removeStorageItem(LAST_SAFE_STORAGE_USER_KEY);
}
