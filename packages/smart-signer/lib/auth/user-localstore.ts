import { User } from '@smart-signer/types/common';
import { defaultUser } from '@smart-signer/lib/auth/utils';
import { isStorageAvailable } from '@smart-signer/lib/utils';
import { safeJsonParse } from '@smart-signer/lib/safe-json-parse';

const USER_LOCAL_STORAGE_KEY = 'user';

export function saveUser(user: User): void {
  if (isStorageAvailable('localStorage', true)) {
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
  if (isStorageAvailable('localStorage', false)) {
    localStorage.removeItem(USER_LOCAL_STORAGE_KEY);
  }
}
