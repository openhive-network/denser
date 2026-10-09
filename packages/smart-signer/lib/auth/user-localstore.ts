import { User } from '@smart-signer/types/common';
import { defaultUser } from '@smart-signer/lib/auth/default-user';
import { isStorageAvailable } from '@smart-signer/lib/utils';
import { safeJsonParse } from '@smart-signer/lib/safe-json-parse';

const USER_LOCAL_STORAGE_KEY = 'user';

export function saveUser(user: User): void {
  if (isStorageAvailable('localStorage')) {
    localStorage.setItem(USER_LOCAL_STORAGE_KEY, JSON.stringify(user));
  }
}

export function getUser(): User {
  if (isStorageAvailable('localStorage')) {
    const user = localStorage.getItem(USER_LOCAL_STORAGE_KEY);
    return safeJsonParse(user, defaultUser, USER_LOCAL_STORAGE_KEY);
  }
  return defaultUser;
}

export function removeUser(): void {
  if (isStorageAvailable('localStorage')) {
    localStorage.removeItem(USER_LOCAL_STORAGE_KEY);
  }
}

/**
 * Whether a `storage` event reports another tab logging out: the stored user removed (or all of
 * localStorage cleared) or replaced with a logged-out user.
 */
export function isLogoutStorageEvent(event: StorageEvent): boolean {
  if (!isStorageAvailable('localStorage') || event.storageArea !== localStorage) return false;
  if (event.key !== null && event.key !== USER_LOCAL_STORAGE_KEY) return false;
  if (event.newValue === null) return true;
  return !safeJsonParse(event.newValue, defaultUser, USER_LOCAL_STORAGE_KEY).isLoggedIn;
}
