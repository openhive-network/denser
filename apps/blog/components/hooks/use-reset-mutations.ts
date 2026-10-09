import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { IFollowList } from '@hive/common-hiveio-packages/wax';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { FOLLOW_LIST_REFRESH_DELAYS, type FollowList } from './use-follow-list-mutations';

const ALL_LISTS: FollowList[] = ['blacklisted', 'muted', 'follow_blacklist', 'follow_muted'];

export function useResetAllListsMutation() {
  const { username } = useUserClient().user;
  const keys = ALL_LISTS.map((list) => [list, username]);
  return useOperationMutation({
    name: 'useResetAllListsMutation',
    optimistic: async (_params: void, queryClient) => {
      const prevDataMap: Record<string, IFollowList[] | undefined> = {};
      for (const queryKey of keys) {
        await queryClient.cancelQueries({ queryKey });
        prevDataMap[queryKey[0]] = queryClient.getQueryData(queryKey);
        queryClient.setQueryData<IFollowList[]>(queryKey, []);
      }
      return { prevDataMap };
    },
    run: () => transactionService.resetAllBlog(OBSERVE),
    onSuccess: (_data, _params, queryClient) =>
      keys.forEach((key) => queryClient.setQueryData<IFollowList[]>(key, [])),
    rollback: (context, _params, queryClient) => {
      for (const [list, prevData] of Object.entries(context?.prevDataMap ?? {})) {
        if (prevData !== undefined) queryClient.setQueryData([list, username], prevData);
      }
    },
    successToast: () => ({
      title: 'All lists reset successfully',
      description: 'Your all lists have been cleared.'
    }),
    invalidate: () => keys,
    invalidateDelays: FOLLOW_LIST_REFRESH_DELAYS
  });
}
