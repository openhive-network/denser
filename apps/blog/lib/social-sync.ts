/**
 * Tells the blog's other open tabs that an account's follows, mutes or blacklists changed, so they
 * refresh what they show. One channel per tab: a BroadcastChannel does not receive its own
 * messages, but would receive those of a second channel of the same name in this tab.
 */

const CHANNEL_NAME = 'denser-social';
const SOCIAL_CHANGED = 'social-changed';

interface SocialChangedMessage {
  type: typeof SOCIAL_CHANGED;
  username: string;
}

let channel: BroadcastChannel | null | undefined;

function getChannel(): BroadcastChannel | null {
  if (channel === undefined) {
    channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

function isSocialChangedMessage(data: unknown): data is SocialChangedMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    data.type === SOCIAL_CHANGED &&
    'username' in data &&
    typeof data.username === 'string' &&
    data.username.length > 0
  );
}

/** Tells the other tabs that `username` changed its social lists; does nothing without BroadcastChannel. */
export function postSocialChanged(username: string): void {
  if (!username) return;
  const message: SocialChangedMessage = { type: SOCIAL_CHANGED, username };
  getChannel()?.postMessage(message);
}

/** Calls `listener` with the username of every change another tab reports; returns the unsubscribe. */
export function subscribeSocialChanged(listener: (username: string) => void): () => void {
  const target = getChannel();
  if (!target) return () => {};
  const handleMessage = (event: MessageEvent) => {
    if (isSocialChangedMessage(event.data)) listener(event.data.username);
  };
  target.addEventListener('message', handleMessage);
  return () => target.removeEventListener('message', handleMessage);
}
