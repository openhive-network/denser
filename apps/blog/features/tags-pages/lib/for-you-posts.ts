import { resolvePosts } from '@transaction/lib/bridge-api';
import { configuredFypApiUrl } from '@ui/config/public-vars';
import { getUser as getStoredUser } from '@smart-signer/lib/auth/user-localstore';
import { isStorageAvailable } from '@smart-signer/lib/utils';
import { FypApiError, getFypFeedPage, type FypEntry } from '@/blog/lib/fyp-api';

/**
 * Whether `account` is still the stored session: another tab's sign-out or account switch is stored
 * before this tab renders it, so a read started meanwhile would still ask for the account. Without
 * localStorage there is no other tab's session to follow.
 */
function isStoredSession(account: string): boolean {
  if (!isStorageAvailable('localStorage')) return true;
  const user = getStoredUser();
  return user.isLoggedIn && user.username === account;
}

/** Page `page` (1-based) of `account`'s For You feed, its cross-posts resolved as `observer`. */
export async function getForYouPosts(account: string, page: number, observer: string): Promise<FypEntry[]> {
  if (!configuredFypApiUrl) throw new FypApiError('The For You feed is off: FYP_API_URL is not set');
  if (!isStoredSession(account)) throw new FypApiError(`The For You feed is not read: ${account} is signed out`);
  return resolvePosts(await getFypFeedPage(configuredFypApiUrl, account, page), observer);
}
