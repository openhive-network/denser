import { User } from '@smart-signer/types/common';
import { defaultUser } from '@smart-signer/lib/auth/utils';

const USER_LOCAL_STORAGE_KEY = 'user';

export function saveUser(user: User): void {
  if (typeof window !== 'undefined' && 'localStorage' in global && global.localStorage) {
    localStorage.setItem(USER_LOCAL_STORAGE_KEY, JSON.stringify(user));
  }
}

export function getUser(): User {
  if (typeof window !== 'undefined' && 'localStorage' in global && global.localStorage) {
    const user = localStorage.getItem(USER_LOCAL_STORAGE_KEY);
    return user ? JSON.parse(user) : defaultUser;
  }
  return defaultUser;
}

export function removeUser(): void {
  if (typeof window !== 'undefined' && 'localStorage' in global && global.localStorage) {
    localStorage.removeItem(USER_LOCAL_STORAGE_KEY);
  }
}
