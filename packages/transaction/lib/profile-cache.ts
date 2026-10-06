import { createAnonymousReadCache, type IAnonymousReadCache, type IFeedCacheOptions } from './feed-cache';

export interface IProfileRequest {
  /** Identifies the chain and API node the data comes from (e.g. chain id + endpoint URL). */
  network: string;
  /** Which read of the profile page this is, e.g. `account` or `posts:blog`. */
  read: string;
  /** The profile's account; empty for reads that do not depend on it. */
  account: string;
  observer: string;
}

export type IProfileCache<T> = IAnonymousReadCache<IProfileRequest, T>;

/** Cache key of a profile read. The observer is not part of it: only anonymous requests are cached. */
export function profileCacheKey(request: IProfileRequest): string {
  const { network, read, account } = request;
  return JSON.stringify([network, read, account]);
}

/**
 * Same settings as the feed cache, except that a value is never served for longer than one TTL
 * past its freshness: the stale window is capped at the TTL.
 */
export function createProfileCache<T>(options: IFeedCacheOptions): IProfileCache<T> {
  const { config } = options;
  return createAnonymousReadCache<IProfileRequest, T>(
    { ...options, config: { ...config, staleMs: Math.min(config.staleMs, config.ttlMs) } },
    profileCacheKey
  );
}
