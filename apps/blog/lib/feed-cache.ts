import type { Entry } from '@hive/common-hiveio-packages/wax';
import { DATA_LIMIT, getPostsRanked } from '@transaction/lib/bridge-api';
import { getReadChain } from '@transaction/lib/chain';
import { createFeedCache, readFeedCacheConfig, type IFeedCache } from '@transaction/lib/feed-cache';
import { getLogger } from '@ui/lib/logging';
import { DEFAULT_OBSERVER } from './utils';
import { keepObserverVotes } from './feed-entries';

const logger = getLogger('app');

type FeedPage = Entry[] | null;

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
 * The first page of a ranked feed as the server renders it, with only the observer's own votes.
 * Anonymous requests are answered from a short-lived process cache (`DENSER_FEED_CACHE_*`);
 * requests with an observer always fetch. Rejects as `getPostsRanked` does.
 */
export async function getFeedFirstPage(sort: string, tag: string, observer: string): Promise<FeedPage> {
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
  return getFeedCache().get(request, async () => {
    const posts = await getPostsRanked(sort, tag, '', '', observer, DATA_LIMIT);
    return posts ? keepObserverVotes(posts, observer) : null;
  });
}
