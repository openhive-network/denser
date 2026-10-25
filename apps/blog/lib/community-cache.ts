import type { Community } from '@hive/common-hiveio-packages/wax';
import { getCommunities, getCommunity } from '@transaction/lib/bridge-api';
import { getReadChain } from '@transaction/lib/chain';
import { readFeedCacheConfig } from '@transaction/lib/feed-cache';
import { createProfileCache, type IProfileCache } from '@transaction/lib/profile-cache';
import { getLogger } from '@ui/lib/logging';
import { DEFAULT_OBSERVER } from './utils';
import type { RenderedCommunityDescription } from '@/blog/features/layouts/community/rendered-description-context';
import { renderCommunityDescription } from '@/blog/features/layouts/community/lib/render-community-description';

const logger = getLogger('app');

export interface CommunityPageData {
  community: Community | null;
  renderedDescription: RenderedCommunityDescription | null;
}

declare global {
  // One cache per server process: route bundles and dev-mode reloads may each evaluate this module.
  var denserCommunityCache: IProfileCache<CommunityPageData> | undefined;
  var denserCommunityListCache: IProfileCache<Community[] | null> | undefined;
}

// A community is an account: its reads share the profile cache's settings and keys.
const createCommunityCache = <T,>(): IProfileCache<T> =>
  createProfileCache<T>({
    config: readFeedCacheConfig(process.env),
    anonymousObserver: DEFAULT_OBSERVER,
    onRevalidateError: (error, key) =>
      logger.warn(error, 'Community cache: reloading %s failed, serving the stale value', key)
  });

const getCommunityCache = (): IProfileCache<CommunityPageData> =>
  (globalThis.denserCommunityCache ??= createCommunityCache<CommunityPageData>());

const getCommunityListCache = (): IProfileCache<Community[] | null> =>
  (globalThis.denserCommunityListCache ??= createCommunityCache<Community[] | null>());

/**
 * A community as its pages' server render needs it: its data and its description rendered.
 * Anonymous requests are answered from a short-lived process cache (`DENSER_FEED_CACHE_*`, served
 * at most one TTL past fresh), so the description isn't rendered again for each of them; requests
 * with an observer always fetch. Rejects as `getCommunity` does.
 */
export async function getCommunityPageData(name: string, observer: string): Promise<CommunityPageData> {
  const chain = getReadChain();
  const request = { network: `${chain.chainId}|${chain.endpointUrl}`, read: 'community', account: name, observer };
  return getCommunityCache().get(request, async () => {
    const community = (await getCommunity(name, observer)) ?? null;
    return { community, renderedDescription: community ? renderCommunityDescription(community) : null };
  });
}

/**
 * The communities listed in `sort` order (no search query), from the same short-lived process cache
 * for anonymous requests; requests with an observer always fetch. Rejects as `getCommunities` does.
 */
export async function getCommunityList(sort: string, observer: string): Promise<Community[] | null> {
  const chain = getReadChain();
  const request = { network: `${chain.chainId}|${chain.endpointUrl}`, read: `communities:${sort}`, account: '', observer };
  return getCommunityListCache().get(request, async () => (await getCommunities(sort, null, observer)) ?? null);
}
