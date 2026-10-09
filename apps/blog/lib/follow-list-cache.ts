import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { IFollowList } from '@hive/common-hiveio-packages/wax';

/** Add an account to a cached IFollowList if not already present. */
export function addToListCache(queryClient: QueryClient, queryKey: QueryKey, name: string) {
  const currentData: IFollowList[] = queryClient.getQueryData(queryKey) ?? [];
  if (!currentData.some((e) => e.name === name)) {
    queryClient.setQueryData<IFollowList[]>(queryKey, [
      { name, blacklist_description: '', muted_list_description: '', _temporary: true },
      ...currentData
    ]);
  }
}

export function removeFromListCache(queryClient: QueryClient, queryKey: QueryKey, name: string) {
  const currentData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
  if (currentData) {
    queryClient.setQueryData<IFollowList[]>(
      queryKey,
      currentData.filter((e) => e.name !== name)
    );
  }
}

export type ListSnapshot = { prev: IFollowList[] | undefined };

/** Cancels in-flight fetches of a follow list and snapshots it for rollback. */
export async function snapshotList(queryClient: QueryClient, queryKey: QueryKey): Promise<ListSnapshot> {
  await queryClient.cancelQueries({ queryKey });
  return { prev: queryClient.getQueryData(queryKey) };
}

export function restoreList(queryClient: QueryClient, queryKey: QueryKey, context: ListSnapshot | undefined) {
  if (context?.prev !== undefined) queryClient.setQueryData(queryKey, context.prev);
}
