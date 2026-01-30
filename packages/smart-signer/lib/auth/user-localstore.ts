import { User } from '@smart-signer/types/common';
import { defaultUser } from '@smart-signer/lib/auth/utils';
import { safeJsonParse } from '@smart-signer/lib/safe-json-parse';
import { getStorageItem, setStorageItem, removeStorageItem, StorageTTL } from '@hive/ui/lib/storage-with-ttl';

const USER_LOCAL_STORAGE_KEY = 'user';

export function saveUser(user: User): void {
  setStorageItem(USER_LOCAL_STORAGE_KEY, user, StorageTTL.PERMANENT);
}

export function getUser(): User {
  const user = getStorageItem<User>(USER_LOCAL_STORAGE_KEY);
  if (user) {
    return user;
  }
  return defaultUser;
}

export function removeUser(): void {
  removeStorageItem(USER_LOCAL_STORAGE_KEY);
}
