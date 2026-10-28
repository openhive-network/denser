import { requestFypWarmUp } from './fyp-api.ts';

const WARMED_UP_KEY_PREFIX = 'fyp-warmed-up:';

export interface FypWarmUpOptions {
  /** The haf_fyp API root; the For You feed is off, and nothing is sent, when undefined. */
  baseUrl: string | undefined;
  /** The signed-in account; nothing is sent when undefined (signed out). */
  account: string | undefined;
  /** Remembers which accounts were warmed up: the browser session's `sessionStorage`. */
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  /** Told of a failed warm-up, which is not retried. */
  onFailure: (error: unknown) => void;
}

/**
 * Asks haf_fyp to re-rank `account`'s For You feed, once per `storage` (browser session) and
 * account, so a reader back after an absence opens a fresh ranking. Never rejects.
 */
export async function warmUpFypFeedOnce({ baseUrl, account, storage, onFailure }: FypWarmUpOptions): Promise<void> {
  if (!baseUrl || !account) return;
  try {
    const key = WARMED_UP_KEY_PREFIX + account;
    if (storage.getItem(key) !== null) return;
    // Marked before sending: a failure is not retried, and a second render does not send it again
    storage.setItem(key, '1');
    await requestFypWarmUp(baseUrl, account);
  } catch (error) {
    onFailure(error);
  }
}
