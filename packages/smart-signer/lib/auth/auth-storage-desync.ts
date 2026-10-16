/**
 * Safe storage does not know the account the session is signed in with, so this page cannot sign
 * for it. The error handler announces it; the user state of the page resets to logged out.
 */

const AUTH_STORAGE_DESYNC_EVENT = 'auth-storage-desync';

interface Subscription {
  count: number;
  unsubscribe: () => void;
}

const subscriptions = new Map<object, Subscription>();

/** Announces a desync to this page's subscribers. */
export function dispatchAuthStorageDesync(target: EventTarget = window): void {
  target.dispatchEvent(new Event(AUTH_STORAGE_DESYNC_EVENT));
}

/**
 * Runs `handler` once per desync for `owner`, however many times it subscribed: every mounted
 * user hook subscribes, the reset they share runs once. The first live subscription of an `owner`
 * supplies the handler. Returns the unsubscribe; the listener goes when the last one is called.
 */
export function subscribeAuthStorageDesync(
  owner: object,
  handler: () => void,
  target: EventTarget = window
): () => void {
  let subscription = subscriptions.get(owner);
  if (!subscription) {
    target.addEventListener(AUTH_STORAGE_DESYNC_EVENT, handler);
    subscription = { count: 0, unsubscribe: () => target.removeEventListener(AUTH_STORAGE_DESYNC_EVENT, handler) };
    subscriptions.set(owner, subscription);
  }
  subscription.count += 1;
  const current = subscription;
  let isSubscribed = true;
  return () => {
    if (!isSubscribed) return;
    isSubscribed = false;
    current.count -= 1;
    if (current.count > 0) return;
    current.unsubscribe();
    subscriptions.delete(owner);
  };
}
