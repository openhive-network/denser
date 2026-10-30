import { getStorageItem, removeStorageItem, setStorageItem } from '@ui/lib/storage-with-ttl';

const LOGOUT_DONE_KEY = 'denser:logout-done';

/** Same-tab twin of the marker: the browser sends `storage` events only to the other tabs */
const LOGOUT_DONE_EVENT = 'denser:logout-done';

/** How long a logout's answer stays announced: any tab still waiting for it has given up by then */
const LOGOUT_DONE_TTL_MS = 5 * 60 * 1000;

/** How long a sign-out waits for the server's logout answer before going on without it */
export const LOGOUT_ANSWER_TIMEOUT_MS = 5000;

/** Marks a logout as pending, before the signed-out user reaches other tabs */
export function clearLogoutDone(): void {
  removeStorageItem(LOGOUT_DONE_KEY);
}

/** Tells every tab, this one too, the server has answered the logout, whether it ended the session or failed */
export function announceLogoutDone(): void {
  const doneAt = Date.now();
  setStorageItem(LOGOUT_DONE_KEY, doneAt, LOGOUT_DONE_TTL_MS);
  window.dispatchEvent(new CustomEvent<number>(LOGOUT_DONE_EVENT, { detail: doneAt }));
}

/** Whether a logout answer was announced at or after `since` (ms since the epoch) */
function isLogoutDoneSince(since: number): boolean {
  const doneAt = getStorageItem<number>(LOGOUT_DONE_KEY);
  return typeof doneAt === 'number' && doneAt >= since;
}

/**
 * Calls `onDone` once when a logout this or another tab started is done (announceLogoutDone), at once
 * if it already is, or after `timeoutMs` when no answer is announced. Only an answer announced at or after
 * `since`, the moment the caller saw the signed-out user, counts: one left by an earlier logout
 * says nothing about this one.
 *
 * @returns a function that cancels the wait
 */
export function whenLogoutDone(since: number, timeoutMs: number, onDone: () => void): () => void {
  if (isLogoutDoneSince(since)) {
    onDone();
    return () => {};
  }
  const cancel = () => {
    clearTimeout(timer);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(LOGOUT_DONE_EVENT, onSameTabDone);
  };
  const finish = () => {
    cancel();
    onDone();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === LOGOUT_DONE_KEY && isLogoutDoneSince(since)) finish();
  };
  const onSameTabDone = (event: Event) => {
    if (event instanceof CustomEvent && typeof event.detail === 'number' && event.detail >= since) finish();
  };
  const timer = setTimeout(finish, timeoutMs);
  window.addEventListener('storage', onStorage);
  window.addEventListener(LOGOUT_DONE_EVENT, onSameTabDone);
  return cancel;
}
