import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { TransactionBroadcastResult } from '@transaction/index';
import { IFollowList } from '@hive/common-hiveio-packages/wax';
import { useOperationMutation, type OperationToast } from '@ui/components/hooks/use-operation-mutation';
import {
  addToListCache,
  removeFromListCache,
  restoreList,
  snapshotList,
  type ListSnapshot
} from '@/blog/lib/follow-list-cache';

/** The account's own follow lists, each cached under `[list, username]`. */
export type FollowList = 'blacklisted' | 'muted' | 'follow_blacklist' | 'follow_muted';

export const FOLLOW_LIST_REFRESH_DELAYS = [4000, 10000, 20000];

interface FollowListOperation<TVariables> {
  name: string;
  run: (variables: TVariables) => Promise<TransactionBroadcastResult>;
  toast: (variables: TVariables) => OperationToast;
}

type ApplyListChange<TVariables> = (
  queryClient: QueryClient,
  queryKey: QueryKey,
  variables: TVariables
) => void;

interface ListChange<TVariables> {
  optimistic?: ApplyListChange<TVariables>;
  // Re-applied after the broadcast: a refetch during an observed broadcast can overwrite the optimistic write.
  onSuccess: ApplyListChange<TVariables>;
  rollback?: (queryClient: QueryClient, queryKey: QueryKey, context: ListSnapshot | undefined) => void;
}

function useFollowListMutation<TVariables>(
  list: FollowList,
  { name, run, toast }: FollowListOperation<TVariables>,
  { optimistic, onSuccess, rollback = restoreList }: ListChange<TVariables>
) {
  const { username } = useUserClient().user;
  const queryKey = [list, username];
  return useOperationMutation({
    name,
    run,
    optimistic: async (variables, queryClient) => {
      const snapshot = await snapshotList(queryClient, queryKey);
      optimistic?.(queryClient, queryKey, variables);
      return snapshot;
    },
    onSuccess: (_data, variables, queryClient) => onSuccess(queryClient, queryKey, variables),
    rollback: (context, _variables, queryClient) => rollback(queryClient, queryKey, context),
    successToast: (_data, variables) => toast(variables),
    invalidate: () => [queryKey, ['entriesInfinite']],
    invalidateDelays: FOLLOW_LIST_REFRESH_DELAYS
  });
}

const addAccount: ApplyListChange<{ otherBlogs: string }> = (queryClient, queryKey, { otherBlogs }) =>
  addToListCache(queryClient, queryKey, otherBlogs);
const emptyList: ApplyListChange<void> = (queryClient, queryKey) =>
  queryClient.setQueryData<IFollowList[]>(queryKey, []);

/** Adds `otherBlogs` to one of the account's follow lists. */
export function useAddToFollowListMutation(
  list: FollowList,
  operation: FollowListOperation<{ otherBlogs: string; blog?: string }>
) {
  return useFollowListMutation(list, operation, {
    optimistic: addAccount,
    onSuccess: addAccount,
    rollback: (queryClient, queryKey, context) => {
      if (context && context.prev === undefined) queryClient.removeQueries({ queryKey });
      else restoreList(queryClient, queryKey, context);
    }
  });
}

/** Removes `blog` from one of the account's follow lists once the broadcast succeeds. */
export function useRemoveFromFollowListMutation(
  list: FollowList,
  operation: FollowListOperation<{ blog: string }>
) {
  return useFollowListMutation(list, operation, {
    onSuccess: (queryClient, queryKey, { blog }) => removeFromListCache(queryClient, queryKey, blog)
  });
}

/** Empties one of the account's follow lists. */
export function useResetFollowListMutation(list: FollowList, operation: FollowListOperation<void>) {
  return useFollowListMutation(list, operation, { optimistic: emptyList, onSuccess: emptyList });
}
