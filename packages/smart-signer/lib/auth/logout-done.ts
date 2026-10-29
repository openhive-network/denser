import { StorageTTL, getStorageItem, removeStorageItem, setStorageItem } from '@ui/lib/storage-with-ttl';

const LOGOUT_DONE_KEY = 'denser:logout-done';

/** How long a sign-out waits for the server's logout answer before going on without it */
export const LOGOUT_ANSWER_TIMEOUT_MS = 5000;

/** Marks a logout as pending, before the signed-out user reaches other tabs */
export function clearLogoutDone(): void {
  removeStorageItem(LOGOUT_DONE_KEY);
}

/** Tells other tabs the server has answered the logout, or that the wait for its answer is over */
export function announceLogoutDone(): void {
  setStorageItem(LOGOUT_DONE_KEY, Date.now(), StorageTTL.SESSION);
}

/**
 * Calls `onDone` once when a logout another tab started is done (announceLogoutDone), at once if it
 * already is, or after `timeoutMs` when no answer is announced.
 *
 * @returns a function that cancels the wait
 */
export function whenLogoutDone(timeoutMs: number, onDone: () => void): () => void {
  if (getStorageItem<number>(LOGOUT_DONE_KEY) !== null) {
    onDone();
    return () => {};
  }
  const cancel = () => {
    clearTimeout(timer);
    window.removeEventListener('storage', onStorage);
  };
  const finish = () => {
    cancel();
    onDone();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === LOGOUT_DONE_KEY && event.newValue !== null) finish();
  };
  const timer = setTimeout(finish, timeoutMs);
  window.addEventListener('storage', onStorage);
  return cancel;
}
