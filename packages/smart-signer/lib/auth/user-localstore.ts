import { User } from '@smart-signer/types/common';
import { defaultUser } from '@smart-signer/lib/auth/default-user';
import { isStorageAvailable } from '@smart-signer/lib/utils';
import { safeJsonParse } from '@smart-signer/lib/safe-json-parse';
import { hasKnownLoginType } from '@smart-signer/lib/auth/known-login-type';

const USER_LOCAL_STORAGE_KEY = 'user';
const ACCOUNTS_LOCAL_STORAGE_KEY = 'accounts';

export function saveUser(user: User): void {
  if (isStorageAvailable('localStorage')) {
    localStorage.setItem(USER_LOCAL_STORAGE_KEY, JSON.stringify(user));
  }
}

/** The stored user, signed out when it was stored by a sign-in method this app no longer has */
function parseUser(json: string | null): User {
  const user = safeJsonParse(json, defaultUser, USER_LOCAL_STORAGE_KEY);
  return hasKnownLoginType(user) ? user : defaultUser;
}

export function getUser(): User {
  if (isStorageAvailable('localStorage')) {
    return parseUser(localStorage.getItem(USER_LOCAL_STORAGE_KEY));
  }
  return defaultUser;
}

export function removeUser(): void {
  if (isStorageAvailable('localStorage')) {
    localStorage.removeItem(USER_LOCAL_STORAGE_KEY);
  }
}

export function saveAccounts(accounts: User[]): void {
  if (isStorageAvailable('localStorage')) {
    localStorage.setItem(ACCOUNTS_LOCAL_STORAGE_KEY, JSON.stringify(accounts));
  }
}

export function getAccounts(): User[] {
  if (isStorageAvailable('localStorage')) {
    const accounts = localStorage.getItem(ACCOUNTS_LOCAL_STORAGE_KEY);
    const parsed = safeJsonParse<unknown>(accounts, [], ACCOUNTS_LOCAL_STORAGE_KEY);
    return Array.isArray(parsed) ? parsed.filter(hasKnownLoginType) : [];
  }
  return [];
}

/**
 * Whether a `storage` event reports another tab logging out: the stored user removed (or all of
 * localStorage cleared) or replaced with a logged-out user.
 */
export function isLogoutStorageEvent(event: StorageEvent): boolean {
  if (!isStorageAvailable('localStorage') || event.storageArea !== localStorage) return false;
  if (event.key !== null && event.key !== USER_LOCAL_STORAGE_KEY) return false;
  if (event.newValue === null) return true;
  return !parseUser(event.newValue).isLoggedIn;
}
