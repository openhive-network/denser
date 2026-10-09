import { cache } from 'react';
import type { FullAccount, IAccountReputations } from '@hive/common-hiveio-packages/wax';
import type { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import { getAccountPosts } from '@transaction/lib/bridge-api';
import { getReadChain } from '@transaction/lib/chain';
import { readFeedCacheConfig } from '@transaction/lib/feed-cache';
import { createProfileCache, type IProfileCache } from '@transaction/lib/profile-cache';
import { getAccountFull, getAccountReputations, getDynamicGlobalProperties } from '@transaction/lib/hive-api';
import { getLogger } from '@ui/lib/logging';
import { getObserver } from './auth-utils';
import { DEFAULT_OBSERVER } from './utils';
import { keepObserverVotes } from './feed-entries';
import type { CardEntry } from '@/blog/features/list-of-posts/lib/card-entry';
import { toCardEntries } from '@/blog/features/list-of-posts/lib/to-card-entries';

const logger = getLogger('app');

type PostsPage = CardEntry[] | null;

interface IProfileCaches {
  account: IProfileCache<FullAccount>;
  reputations: IProfileCache<IAccountReputations[]>;
  globalProperties: IProfileCache<GetDynamicGlobalPropertiesResponse>;
  posts: IProfileCache<PostsPage>;
}

declare global {
  // One set of caches per server process: route bundles and dev-mode reloads may each evaluate this module.
  var denserProfileCaches: IProfileCaches | undefined;
}

const createCache = <T,>(cacheIf?: (value: T) => boolean): IProfileCache<T> =>
  createProfileCache<T>({
    config: readFeedCacheConfig(process.env),
    anonymousObserver: DEFAULT_OBSERVER,
    cacheIf,
    onRevalidateError: (error, key) =>
      logger.warn(error, 'Profile cache: reloading %s failed, serving the stale value', key)
  });

// `getAccountFull` leaves the follow stats undefined when their read failed. Such an account is
// served to its own request only, so one upstream blip is not shown to every anonymous viewer.
const hasFollowStats = (account: FullAccount): boolean => account.follow_stats !== undefined;

const getCaches = (): IProfileCaches =>
  (globalThis.denserProfileCaches ??= {
    account: createCache(hasFollowStats),
    reputations: createCache(),
    globalProperties: createCache(),
    posts: createCache()
  });

const profileRequest = async (read: string, account: string) => {
  const chain = getReadChain();
  return { network: `${chain.chainId}|${chain.endpointUrl}`, read, account, observer: await getObserver() };
};

/*
 * The server-side reads of a profile page. Anonymous requests are answered from a short-lived
 * process cache (`DENSER_FEED_CACHE_*`, served at most one TTL past fresh); requests with an
 * observer always fetch. Each rejects as the API call it wraps does.
 */

export const getProfileAccount = cache(async (username: string): Promise<FullAccount> =>
  getCaches().account.get(await profileRequest('account', username), () => getAccountFull(username))
);

export const getProfileReputations = async (username: string): Promise<IAccountReputations[]> =>
  getCaches().reputations.get(await profileRequest('reputation', username), () =>
    getAccountReputations(username, 1)
  );

export const getProfileGlobalProperties = async (): Promise<GetDynamicGlobalPropertiesResponse> =>
  getCaches().globalProperties.get(await profileRequest('dynamic-global-properties', ''), () =>
    getDynamicGlobalProperties()
  );

/**
 * The first page of a profile tab's posts as the server renders it: card entries with only the viewer's own votes.
 * `observer` is the one sent to the API; the viewer is the signed-in user, or the default observer.
 */
export const getProfilePostsFirstPage = async (
  sort: string,
  username: string,
  observer: string
): Promise<PostsPage> => {
  const request = { ...(await profileRequest(`posts:${sort}`, username)), observer };
  // Cached with every vote: one cached page serves every viewer that sends the default observer.
  const page = await getCaches().posts.get(request, async () => {
    const posts = await getAccountPosts(sort, username, observer, '', '');
    return posts ? toCardEntries(posts) : null;
  });
  return page && keepObserverVotes(page, await getObserver());
};
