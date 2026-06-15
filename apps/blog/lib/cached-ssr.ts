import { unstable_cache } from 'next/cache';
import { getPostsRanked, getCommunities } from '@transaction/lib/bridge-api';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';

/**
 * Anonymous SSR data caching.
 *
 * The trending/hot/created feeds and the communities list are identical for
 * every anonymous visitor, yet each request re-fetches them from the live Hive
 * API. That live round-trip dominates server response time (measured at ~3.5s),
 * which is the single largest driver of LCP / poor Lighthouse performance.
 *
 * Cache the anonymous results for a short window so the server responds from
 * cache instead of waiting on Hive on every request. Logged-in users keep their
 * personalised observer and bypass these caches entirely (see call sites).
 */

const FEED_REVALIDATE_SECONDS = 30;
const COMMUNITIES_REVALIDATE_SECONDS = 300;

export const getCachedAnonymousRankedPosts = unstable_cache(
  (sort: string, tag: string) => getPostsRanked(sort, tag, '', '', DEFAULT_OBSERVER),
  ['ssr-anonymous-ranked-posts'],
  { revalidate: FEED_REVALIDATE_SECONDS, tags: ['ssr-ranked-posts'] }
);

export const getCachedAnonymousCommunities = unstable_cache(
  (sort: string, query: string | null) => getCommunities(sort, query ?? undefined, DEFAULT_OBSERVER),
  ['ssr-anonymous-communities'],
  { revalidate: COMMUNITIES_REVALIDATE_SECONDS, tags: ['ssr-communities'] }
);
