/**
 * Tells the other open tabs that the signed-in accounts or the active one changed (a switch or a
 * removal), so they follow. The message carries no data: the tab that changed them stored them in
 * localStorage first, which every tab reads. One channel per tab: a BroadcastChannel does not
 * receive its own messages, but would receive those of a second channel of the same name in this tab.
 */

const CHANNEL_NAME = 'denser-accounts';
const ACCOUNTS_CHANGED = 'accounts-changed';

interface AccountsChangedMessage {
  type: typeof ACCOUNTS_CHANGED;
}

let channel: BroadcastChannel | null | undefined;

function getChannel(): BroadcastChannel | null {
  if (channel === undefined) {
    channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

function isAccountsChangedMessage(data: unknown): data is AccountsChangedMessage {
  return typeof data === 'object' && data !== null && 'type' in data && data.type === ACCOUNTS_CHANGED;
}

/** Tells the other tabs the stored accounts changed; does nothing without BroadcastChannel. */
export function postAccountsChanged(): void {
  const message: AccountsChangedMessage = { type: ACCOUNTS_CHANGED };
  getChannel()?.postMessage(message);
}

/** Calls `listener` on every change another tab reports; returns the unsubscribe. */
export function subscribeAccountsChanged(listener: () => void): () => void {
  const target = getChannel();
  if (!target) return () => {};
  const handleMessage = (event: MessageEvent) => {
    if (isAccountsChangedMessage(event.data)) listener();
  };
  target.addEventListener('message', handleMessage);
  return () => target.removeEventListener('message', handleMessage);
}
