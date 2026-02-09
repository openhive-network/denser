import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { IFollowList } from '@hive/common-hiveio-packages/wax';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/handle-error';
import { scheduleInvalidations } from '@/blog/lib/react-query';

const logger = getLogger('app');

export function useResetAllListsMutation() {
  const { user } = useUserClient();
  const queryClient = useQueryClient();
  const resetAllListsMutation = useMutation({
    onMutate: async () => {
      const { username } = user;
      const keys = [
        ['blacklisted', username],
        ['muted', username],
        ['follow_blacklist', username],
        ['follow_muted', username]
      ];

      const prevDataMap: Record<string, IFollowList[] | undefined> = {};

      for (const queryKey of keys) {
        await queryClient.cancelQueries({ queryKey });
        prevDataMap[queryKey[0]] = queryClient.getQueryData(queryKey);
        queryClient.setQueryData<IFollowList[]>(queryKey, []);
      }

      return { prevDataMap, username };
    },

    mutationFn: async () => {
      const broadcastResult = await transactionService.resetAllBlog({ observe: true });
      logger.info('Done reset all lists transaction: %o', { broadcastResult });
      return { broadcastResult };
    },

    onSettled: (data) => {
      if (!data) return;
      const { username } = user;
      queryClient.setQueryData<IFollowList[]>(['blacklisted', username], []);
      queryClient.setQueryData<IFollowList[]>(['muted', username], []);
      queryClient.setQueryData<IFollowList[]>(['follow_blacklist', username], []);
      queryClient.setQueryData<IFollowList[]>(['follow_muted', username], []);
    },

    onSuccess: (data) => {
      const { username } = user;
      toast({
        title: 'All lists reset successfully',
        description: 'Your all lists have been cleared.',
        variant: 'success'
      });
      scheduleInvalidations(
        queryClient,
        [
          ['blacklisted', username],
          ['muted', username],
          ['follow_blacklist', username],
          ['follow_muted', username]
        ],
        [4000, 10000, 20000]
      );
      logger.info('useResetAllListsMutation onSuccess: %o', data);
    },

    onError: (error: unknown, _variables, context) => {
      if (context?.prevDataMap && context?.username) {
        const { prevDataMap, username } = context;
        for (const [type, prevData] of Object.entries(prevDataMap)) {
          if (prevData !== undefined) {
            queryClient.setQueryData([type, username], prevData);
          }
        }
      }

      handleError(error, {
        method: 'useResetAllListsMutation',
        params: {}
      });
    }
  });

  return resetAllListsMutation;
}
