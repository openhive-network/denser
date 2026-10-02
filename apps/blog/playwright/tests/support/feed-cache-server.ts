/**
 * The fixture suite's second blog server, the only one serving with the server-side feed cache on
 * (feedCache.spec.ts). The main server runs with it off: all specs share that server, and a cached
 * feed would answer one spec with the previous spec's recording.
 */
export const FEED_CACHE_PORT = 3001;
export const FEED_CACHE_TTL_S = 3;
export const FEED_CACHE_STALE_S = 3;
