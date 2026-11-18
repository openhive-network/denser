/**
 * Per-username avatar versions for this browser session.
 *
 * imagehoster answers `/u/<name>/avatar` with a redirect the browser caches. After a user
 * changes their own picture, a version recorded here lets their avatar URL carry `?v=` so
 * the browser fetches a fresh redirect. Versions live in `sessionStorage`: they survive
 * reloads in the tab and are gone with it, after which normal caching applies again.
 */

const KEY_PREFIX = 'avatar-version:';

type Listener = () => void;
const listeners = new Set<Listener>();

function sessionStore(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.sessionStorage;
  } catch {
    // Storage disabled by browser settings: avatars just keep their plain URLs.
    return undefined;
  }
}

/**
 * The version recorded for `username` in this session, or undefined (always on the server).
 */
export function readAvatarVersion(username: string): number | undefined {
  if (!username) return undefined;
  const raw = sessionStore()?.getItem(KEY_PREFIX + username);
  const version = raw ? Number(raw) : NaN;
  return Number.isSafeInteger(version) && version > 0 ? version : undefined;
}

/**
 * Records a new avatar version for `username` and notifies subscribers.
 */
export function recordAvatarVersion(username: string, version: number = Date.now()): void {
  const storage = sessionStore();
  if (!username || !storage) return;
  try {
    storage.setItem(KEY_PREFIX + username, String(version));
  } catch {
    // Quota exceeded: the avatar refreshes once the browser's cache entry expires.
    return;
  }
  listeners.forEach((listener) => listener());
}

/**
 * Calls `listener` whenever a version is recorded; returns the unsubscribe function.
 */
export function subscribeAvatarVersions(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
