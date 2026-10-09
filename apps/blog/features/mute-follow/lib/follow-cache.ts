import { QueryClient, QueryKey, UseInfiniteQueryResult } from '@tanstack/react-query';
import { IFollow, IFollowList, FullAccount } from '@hive/common-hiveio-packages/wax';

export type InfiniteFollowData = UseInfiniteQueryResult<IFollow[]>['data'];

/** Filter a user from all pages of an infinite follow query. */
export function filterFromAllPages(
  data: InfiniteFollowData,
  username: string,
  field: 'following' | 'follower' = 'following'
): InfiniteFollowData {
  if (!data) return undefined;
  return { ...data, pages: data.pages.map((page) => page.filter((e) => e[field] !== username)) };
}

/** Prepend an item to the first page of an infinite follow query. */
export function prependToFirstPage(data: InfiniteFollowData, item: IFollow): InfiniteFollowData {
  if (!data) return undefined;
  return { ...data, pages: [[item, ...data.pages[0]], ...data.pages.slice(1)] };
}

/** Optimistically shift follow_stats counts on both cached profiles. */
export function updateProfileFollowCounts(
  queryClient: QueryClient,
  username: string,
  otherUsername: string,
  delta: number
) {
  const updates: [string, 'follower_count' | 'following_count'][] = [
    [username, 'following_count'],
    [otherUsername, 'follower_count']
  ];
  for (const [account, field] of updates) {
    const profile: FullAccount | undefined = queryClient.getQueryData(['profileData', account]);
    if (!profile?.follow_stats) continue;
    queryClient.setQueryData(['profileData', account], {
      ...profile,
      follow_stats: {
        ...profile.follow_stats,
        [field]: Math.max(0, (profile.follow_stats[field] ?? 0) + delta)
      }
    });
  }
}

/** Cancels the affected queries and snapshots them for rollback. */
export async function snapshotFollowCaches(
  queryClient: QueryClient,
  username: string,
  otherUsername: string
) {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: ['followingData', username] }),
    queryClient.cancelQueries({ queryKey: ['followersData', otherUsername] }),
    queryClient.cancelQueries({ queryKey: ['profileData', username] }),
    queryClient.cancelQueries({ queryKey: ['profileData', otherUsername] })
  ]);
  return {
    // All followingData variants, discovered dynamically; key[2] === 'ignore' marks the mute lists.
    prevFollowingAll: queryClient.getQueriesData<InfiniteFollowData>({
      queryKey: ['followingData', username]
    }),
    prevFollowers: queryClient.getQueryData<InfiniteFollowData>(['followersData', otherUsername]),
    prevMuteData: undefined as IFollowList[] | undefined,
    prevProfileSelf: queryClient.getQueryData<FullAccount>(['profileData', username]),
    prevProfileOther: queryClient.getQueryData<FullAccount>(['profileData', otherUsername])
  };
}

type FollowSnapshot = Awaited<ReturnType<typeof snapshotFollowCaches>>;

export function rollbackFollowCaches(
  queryClient: QueryClient,
  username: string,
  otherUsername: string,
  context: FollowSnapshot | undefined
) {
  if (!context) return;
  for (const [key, data] of context.prevFollowingAll) queryClient.setQueryData(key, data);
  const restores: [QueryKey, unknown][] = [
    [['followersData', otherUsername], context.prevFollowers],
    [['muted', otherUsername], context.prevMuteData],
    [['profileData', username], context.prevProfileSelf],
    [['profileData', otherUsername], context.prevProfileOther]
  ];
  for (const [key, data] of restores) if (data !== undefined) queryClient.setQueryData(key, data);
}
