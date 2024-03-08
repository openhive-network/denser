import { User } from '@smart-signer/types/common';
import { defaultUser } from '@smart-signer/lib/auth/utils';
import { isStorageAvailable } from '@smart-signer/lib/utils';

const USER_LOCAL_STORAGE_KEY = 'user';

export function saveUser(user: User): void {
  if (isStorageAvailable('localStorage', true)) {
    localStorage.setItem(USER_LOCAL_STORAGE_KEY, JSON.stringify(user));
  }
}

export function getUser(): User {
  if (isStorageAvailable('localStorage')) {
    const user = localStorage.getItem(USER_LOCAL_STORAGE_KEY);
    return user ? JSON.parse(user) : defaultUser;
  }
  return defaultUser;
}

export function removeUser(): void {
  if (isStorageAvailable('localStorage', false)) {
    localStorage.removeItem(USER_LOCAL_STORAGE_KEY);
  }
}
