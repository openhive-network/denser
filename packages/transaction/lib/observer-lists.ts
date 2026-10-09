import { commonVariables } from '@ui/lib/common-variables';
import { getStorageItem, removeStorageItem, setStorageItem } from '@ui/lib/storage-with-ttl';

/**
 * Whether an account filters reads through lists of its own (its mutes, its blacklist, or muted
 * lists and blacklists it follows) decides which observer its feed and post reads send. Hivemind
 * applies all of them through the `observer` parameter; an account without any sees what the
 * default observer sees, so it sends the default observer and shares the API nodes' (and this
 * server's) cache of anonymous reads.
 */

/** How long a stored answer is trusted; lists can also change from another frontend. */
export const OWN_LISTS_TTL_MS = 24 * 60 * 60 * 1000;

/** Names the account that has no lists of its own, for server-side rendering. */
export const NO_OWN_LISTS_COOKIE = 'observer-no-own-lists';

const STORAGE_PREFIX = 'observer-own-lists-';

/** The React Query key of the API check, so concurrent checks of one account share a request. */
export const ownListsQueryKey = (username: string) => ['observerOwnLists', username];

export interface IObserverListsApi {
  getFollowList: (observer: string, followType: 'muted' | 'blacklisted') => Promise<unknown[]>;
  doesUserFollowAnyLists: (observer: string) => Promise<boolean>;
}

/**
 * The observer of a feed, post, discussion or search read.
 *
 * @param username - the signed-in account, or '' when logged out
 * @param hasOwnLists - whether it has lists of its own; null when unknown
 * @returns the username unless the account is known to have no lists of its own, else the default observer
 */
export function getEffectiveObserver(username: string, hasOwnLists: boolean | null): string {
  return username && hasOwnLists !== false ? username : commonVariables.defaultObserver;
}

/** Asks the API whether `username` has any list of its own that filters what it reads. */
export async function fetchHasOwnLists(username: string, api: IObserverListsApi): Promise<boolean> {
  const [muted, blacklisted, followsLists] = await Promise.all([
    api.getFollowList(username, 'muted'),
    api.getFollowList(username, 'blacklisted'),
    api.doesUserFollowAnyLists(username)
  ]);
  return muted.length > 0 || blacklisted.length > 0 || followsLists;
}

const listeners = new Set<() => void>();

/** Calls `listener` whenever a stored answer changes in this tab; returns the unsubscribe. */
export function subscribeOwnLists(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether `username` has lists of its own, as stored; null when never checked or expired. */
export function readOwnLists(username: string): boolean | null {
  return getStorageItem<boolean>(`${STORAGE_PREFIX}${username}`);
}

function writeNoOwnListsCookie(username: string | null) {
  if (typeof document === 'undefined') return;
  const secure = window.location?.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    username === null
      ? `${NO_OWN_LISTS_COOKIE}=; path=/; max-age=0`
      : `${NO_OWN_LISTS_COOKIE}=${username}; path=/; max-age=${OWN_LISTS_TTL_MS / 1000}; SameSite=Lax${secure}`;
}

/** Stores the answer for `username` (in this browser, and in a cookie the server reads). */
export function rememberOwnLists(username: string, hasOwnLists: boolean): void {
  setStorageItem(`${STORAGE_PREFIX}${username}`, hasOwnLists, OWN_LISTS_TTL_MS);
  writeNoOwnListsCookie(hasOwnLists ? null : username);
  listeners.forEach((listener) => listener());
}

/** Drops the answer for `username`, so its reads send its name until it is checked again. */
export function forgetOwnLists(username: string): void {
  removeStorageItem(`${STORAGE_PREFIX}${username}`);
  writeNoOwnListsCookie(null);
  listeners.forEach((listener) => listener());
}

/**
 * Updates the stored answer once `username` changed one of its lists: after an addition it has
 * lists of its own; after a removal it is unknown, so it is checked again.
 */
export function updateOwnListsAfterChange(username: string, added: boolean): void {
  if (added) rememberOwnLists(username, true);
  else forgetOwnLists(username);
}

/** Checks `username`'s lists through the API and stores the answer. Rejects as the API calls do. */
export async function refreshOwnLists(username: string, api: IObserverListsApi): Promise<boolean> {
  const hasOwnLists = await fetchHasOwnLists(username, api);
  rememberOwnLists(username, hasOwnLists);
  return hasOwnLists;
}
