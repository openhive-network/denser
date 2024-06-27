import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes reset blog list transaction.
 *
 * @export
 * @return {*}
 */
export function useResetBlogListMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const resetBlogListMutation = useMutation({
    mutationFn: async () => {
      const broadcastResult = await transactionService.resetBlogList({ observe: true });
      const response = { broadcastResult };
      logger.info('Done reset blog list transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['muted', username] });
      logger.info('useResetBlogListMutation onSuccess: %o', data);
    }
  });

  return resetBlogListMutation;
}

/**
 * Makes reset blacklist blog transaction.
 *
 * @export
 * @return {*}
 */
export function useResetBlacklistBlogMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const resetBlacklistBlogMutation = useMutation({
    mutationFn: async () => {
      const broadcastResult = await transactionService.resetBlacklistBlog({ observe: true });
      const response = { broadcastResult };
      logger.info('Done reset blacklist blog transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['blacklisted', username] });
      logger.info('useResetBlacklistBlogMutation onSuccess: %o', data);
    }
  });

  return resetBlacklistBlogMutation;
}

/**
 * Makes reset follow blacklist blog transaction.
 *
 * @export
 * @return {*}
 */
export function useResetFollowBlacklistBlogMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const resetFollowBlacklistBlogMutation = useMutation({
    mutationFn: async () => {
      const broadcastResult = await transactionService.resetFollowBlacklistBlog({ observe: true });
      const response = { broadcastResult };
      logger.info('Done reset follow blacklist blog transactio: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['follow_blacklist', username] });
      logger.info('useResetFollowBlacklistBlogMutation onSuccess: %o', data);
    }
  });

  return resetFollowBlacklistBlogMutation;
}

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
