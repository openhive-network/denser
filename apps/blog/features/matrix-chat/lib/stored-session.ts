import { getStorageItem, removeStorageItem, setStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';
import type { MatrixCredentials, MatrixSessionStore } from '@/blog/features/matrix-chat/lib/matrix-chat-sign-in';

const SESSION_KEY_PREFIX = 'matrix-chat-session-';

const keyOf = (userId: string) => `${SESSION_KEY_PREFIX}${userId}`;

function waitForWrite(userId: string, ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const settle = (outcome: () => void) => {
      clearTimeout(timer);
      window.removeEventListener('storage', onStorage);
      signal.removeEventListener('abort', onAbort);
      outcome();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === keyOf(userId) && event.newValue) settle(resolve);
    };
    const onAbort = () => settle(() => reject(signal.reason));
    const timer = setTimeout(() => settle(resolve), ms);
    window.addEventListener('storage', onStorage);
    signal.addEventListener('abort', onAbort);
  });
}

/**
 * The browser's Matrix chat sessions, one per user in localStorage for `StorageTTL.SESSION`, so
 * that every tab and page load of the site resumes the same one. A `storage` event tells a tab
 * when another one stored a session.
 */
export const browserMatrixSessionStore: MatrixSessionStore = {
  read: (userId) => getStorageItem<unknown>(keyOf(userId)),
  write: (credentials: MatrixCredentials) => setStorageItem(keyOf(credentials.userId), credentials, StorageTTL.SESSION),
  remove: (userId) => removeStorageItem(keyOf(userId)),
  waitForWrite
};
