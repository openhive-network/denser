import { DATA_LIMIT, getPostsRanked } from '@transaction/lib/bridge-api';
import { getReadChain } from '@transaction/lib/chain';
import { createFeedCache, readFeedCacheConfig, type IFeedCache } from '@transaction/lib/feed-cache';
import { getLogger } from '@ui/lib/logging';
import { DEFAULT_OBSERVER } from './utils';
import { keepObserverVotes } from './feed-entries';
import type { CardEntry } from '@/blog/features/list-of-posts/lib/card-entry';
import { toCardEntries } from '@/blog/features/list-of-posts/lib/to-card-entries';

const logger = getLogger('app');

type FeedPage = CardEntry[] | null;

declare global {
  // One cache per server process: route bundles and dev-mode reloads may each evaluate this module.
  var denserFeedCache: IFeedCache<FeedPage> | undefined;
}

const getFeedCache = (): IFeedCache<FeedPage> =>
  (globalThis.denserFeedCache ??= createFeedCache<FeedPage>({
    config: readFeedCacheConfig(process.env),
    anonymousObserver: DEFAULT_OBSERVER,
    onRevalidateError: (error, key) =>
      logger.warn(error, 'Feed cache: reloading %s failed, serving the stale feed', key)
  }));

/**
 * The first page of a ranked feed as the server renders it: card entries with only the viewer's own votes.
 * `observer` is the one sent to the API (see `getEffectiveObserverFromCookies`); `viewer` is the
 * signed-in user, or the default observer. Requests for the default observer are answered from a
 * short-lived process cache (`DENSER_FEED_CACHE_*`); requests with another observer always fetch.
 * Rejects as `getPostsRanked` does.
 */
export async function getFeedFirstPage(
  sort: string,
  tag: string,
  observer: string,
  viewer: string
): Promise<FeedPage> {
  const chain = getReadChain();
  const request = {
    network: `${chain.chainId}|${chain.endpointUrl}`,
    sort,
    tag,
    startAuthor: '',
    startPermlink: '',
    limit: DATA_LIMIT,
    observer
  };
  // Cached with every vote: one cached page serves every viewer that sends the default observer.
  const page = await getFeedCache().get(request, async () => {
    const posts = await getPostsRanked(sort, tag, '', '', observer, DATA_LIMIT);
    return posts ? toCardEntries(posts) : null;
  });
  return page && keepObserverVotes(page, viewer);
}
