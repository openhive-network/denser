import { QueryClient } from '@tanstack/react-query';
import { Entry } from '@hive/common-hiveio-packages/wax';

export type CacheSnapshot = { queryKey: readonly unknown[]; data: unknown };

/**
 * Optimistically update total_votes in postData, discussionData, and entriesInfinite caches.
 * Returns snapshots for rollback.
 */
export function optimisticUpdateTotalVotes(
  queryClient: QueryClient,
  author: string,
  permlink: string,
  delta: number
): CacheSnapshot[] {
  if (delta === 0) return [];

  const snapshots: CacheSnapshot[] = [];

  // Update postData queries (single Entry objects)
  const postQueries = queryClient.getQueriesData<Entry>({ queryKey: ['postData', author, permlink] });
  for (const [key, data] of postQueries) {
    if (!data?.stats) continue;
    snapshots.push({ queryKey: key, data: structuredClone(data) });
    queryClient.setQueryData(key, {
      ...data,
      stats: { ...data.stats, total_votes: Math.max(0, data.stats.total_votes + delta) }
    });
  }

  // Update discussionData queries (record of entries keyed by path)
  const discussionQueries = queryClient.getQueriesData<Record<string, Entry>>({
    queryKey: ['discussionData']
  });
  for (const [key, data] of discussionQueries) {
    if (!data) continue;
    const entryKey = Object.keys(data).find((k) => {
      const entry = data[k];
      return entry?.author === author && entry?.permlink === permlink;
    });
    if (!entryKey || !data[entryKey]?.stats) continue;
    snapshots.push({ queryKey: key, data: structuredClone(data) });
    const entry = data[entryKey];
    queryClient.setQueryData(key, {
      ...data,
      [entryKey]: {
        ...entry,
        stats: { ...entry.stats, total_votes: Math.max(0, (entry.stats?.total_votes ?? 0) + delta) }
      }
    });
  }

  // Update entriesInfinite queries (paginated arrays of Entry objects)
  const infiniteQueries = queryClient.getQueriesData<{ pages: Entry[][]; pageParams: unknown[] }>({
    queryKey: ['entriesInfinite']
  });
  for (const [key, data] of infiniteQueries) {
    if (!data?.pages) continue;
    let found = false;
    const updatedPages = data.pages.map((page) =>
      page.map((entry) => {
        if (entry.author === author && entry.permlink === permlink && entry.stats) {
          found = true;
          return {
            ...entry,
            stats: { ...entry.stats, total_votes: Math.max(0, (entry.stats.total_votes ?? 0) + delta) }
          };
        }
        return entry;
      })
    );
    if (!found) continue;
    snapshots.push({ queryKey: key, data: structuredClone(data) });
    queryClient.setQueryData(key, { ...data, pages: updatedPages });
  }

  return snapshots;
}
