import { CacheBudget } from '@transaction/lib/cache-budget';
import { readFeedCacheConfig } from '@transaction/lib/feed-cache';

declare global {
  // One budget per server process, shared by every anonymous-read cache (`DENSER_FEED_CACHE_MAX_MB`).
  var denserServerCacheBudget: CacheBudget | undefined;
}

export const getServerCacheBudget = (): CacheBudget =>
  (globalThis.denserServerCacheBudget ??= new CacheBudget(readFeedCacheConfig(process.env).maxBytes));
