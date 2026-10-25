import { resolvePosts } from '@transaction/lib/bridge-api';
import { configuredFypApiUrl } from '@ui/config/public-vars';
import { FypApiError, getFypFeedPage, type FypEntry } from '@/blog/lib/fyp-api';

/** Page `page` (1-based) of `account`'s For You feed, its cross-posts resolved as `observer`. */
export async function getForYouPosts(account: string, page: number, observer: string): Promise<FypEntry[]> {
  if (!configuredFypApiUrl) throw new FypApiError('The For You feed is off: FYP_API_URL is not set');
  return resolvePosts(await getFypFeedPage(configuredFypApiUrl, account, page), observer);
}
