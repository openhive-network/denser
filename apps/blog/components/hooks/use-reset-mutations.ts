import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes reset follow muted blog transaction.
 *
 * @export
 * @return {*}
 */
export function useResetFollowMutedBlogMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const resetFollowMutedBlogMutation = useMutation({
    mutationFn: async () => {
      const broadcastResult = await transactionService.resetFollowMutedBlog({ observe: true });
      const response = { broadcastResult };
      logger.info('Done reset follow muted blog transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['follow_muted', username] });
      logger.info('useResetFollowMutedBlogMutation onSuccess: %o', data);
    }
  });

  return resetFollowMutedBlogMutation;
}

export function useResetAllListsMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const resetAllListsMutation = useMutation({
    mutationFn: async () => {
      const broadcastResult = await transactionService.resetAllBlog({ observe: true });
      const response = { broadcastResult };
      logger.info('Done reset all lists transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      queryClient.invalidateQueries({
        queryKey: ['muted', username]
      });
      queryClient.invalidateQueries({
        queryKey: ['blacklisted', username]
      });
      queryClient.invalidateQueries({
        queryKey: ['follow_muted', username]
      });
      queryClient.invalidateQueries({
        queryKey: ['follow_blacklist', username]
      });
      logger.info('useResetAllListsMutation onSuccess: %o', data);
    }
  });

  return resetAllListsMutation;
}
