import { StaleWhileRevalidateCache } from './stale-while-revalidate-cache';

const DEFAULT_TTL_S = 30;
const DEFAULT_STALE_S = 30;
const DEFAULT_MAX_MB = 32;
const BYTES_PER_MB = 1024 * 1024;

export interface IFeedCacheConfig {
  /** 0 turns the cache off. */
  ttlMs: number;
  staleMs: number;
  maxBytes: number;
}

const parseNonNegative = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

/**
 * Reads the feed cache settings: `DENSER_FEED_CACHE_TTL_S` (fresh, default 30, 0 = off),
 * `DENSER_FEED_CACHE_STALE_S` (served stale while reloading, past the TTL, default 30) and
 * `DENSER_FEED_CACHE_MAX_MB` (memory cap, default 32). Invalid values fall back to the default.
 */
export function readFeedCacheConfig(env: Record<string, string | undefined>): IFeedCacheConfig {
  return {
    ttlMs: parseNonNegative(env.DENSER_FEED_CACHE_TTL_S, DEFAULT_TTL_S) * 1000,
    staleMs: parseNonNegative(env.DENSER_FEED_CACHE_STALE_S, DEFAULT_STALE_S) * 1000,
    maxBytes: parseNonNegative(env.DENSER_FEED_CACHE_MAX_MB, DEFAULT_MAX_MB) * BYTES_PER_MB
  };
}

export interface IFeedRequest {
  /** Identifies the chain and API node the data comes from (e.g. chain id + endpoint URL). */
  network: string;
  sort: string;
  tag: string;
  startAuthor: string;
  startPermlink: string;
  limit: number;
  observer: string;
}

/** Cache key of a feed request. The observer is not part of it: only anonymous requests are cached. */
export function feedCacheKey(request: IFeedRequest): string {
  const { network, sort, tag, startAuthor, startPermlink, limit } = request;
  return JSON.stringify([network, sort, tag, startAuthor, startPermlink, limit]);
}

export interface IFeedCacheOptions {
  config: IFeedCacheConfig;
  /** The observer of requests without a viewer; requests for any other observer are never cached. */
  anonymousObserver: string;
  onRevalidateError?: (error: unknown, key: string) => void;
  now?: () => number;
}

/** A request the anonymous-read cache can answer: only the anonymous observer's requests are cached. */
export interface IObservedRequest {
  observer: string;
}

export interface IAnonymousReadCache<R extends IObservedRequest, T> {
  /** Answers from the cache for anonymous requests; calls `load` directly for any other observer. */
  get: (request: R, load: () => Promise<T>) => Promise<T>;
}

export type IFeedCache<T> = IAnonymousReadCache<IFeedRequest, T>;

/**
 * Process cache of server-side reads that look the same to every anonymous visitor.
 * `keyOf` must separate every request field that changes the answer, except the observer.
 */
export function createAnonymousReadCache<R extends IObservedRequest, T>(
  options: IFeedCacheOptions,
  keyOf: (request: R) => string
): IAnonymousReadCache<R, T> {
  const { config, anonymousObserver } = options;
  if (config.ttlMs === 0) return { get: (_request, load) => load() };

  const cache = new StaleWhileRevalidateCache<T>({
    freshMs: config.ttlMs,
    staleMs: config.staleMs,
    maxSize: config.maxBytes,
    // UTF-16 code units, close enough to the retained size for a memory cap.
    sizeOf: (value) => JSON.stringify(value)?.length ?? 0,
    onRevalidateError: options.onRevalidateError,
    now: options.now
  });
  return {
    get: (request, load) =>
      request.observer === anonymousObserver ? cache.get(keyOf(request), load) : load()
  };
}

export function createFeedCache<T>(options: IFeedCacheOptions): IFeedCache<T> {
  return createAnonymousReadCache<IFeedRequest, T>(options, feedCacheKey);
}
