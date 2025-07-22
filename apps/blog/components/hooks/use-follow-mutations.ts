import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes follow transaction.
 *
 * @export
 * @return {*}
 */
export function useFollowMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const followMutation = useMutation({
    mutationFn: async (params: { username: string }) => {
      const { username } = params;
      const broadcastResult = await transactionService.follow(username, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done follow transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      const { username: otherUsername } = data;
      queryClient.invalidateQueries({ queryKey: ['muted', username] });
      queryClient.invalidateQueries({ queryKey: ['followingData', otherUsername] });
      queryClient.invalidateQueries({ queryKey: ['followingData', username] });
      queryClient.invalidateQueries({ queryKey: ['followersData', otherUsername] });
      queryClient.invalidateQueries({ queryKey: ['profileData', username] });
      queryClient.invalidateQueries({ queryKey: ['profileData', otherUsername] });
      logger.info('useFollowMutation onSuccess data: %o', data);
    }
  });

  return followMutation;
}

/**
 * Makes unfollow transaction.
 *
 * @export
 * @return {*}
 */
export function useUnfollowMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const unfollowMutation = useMutation({
    mutationFn: async (params: { username: string }) => {
      const { username } = params;
      const broadcastResult = await transactionService.unfollow(username, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done unfollow transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      const { username: otherUsername } = data;
      queryClient.invalidateQueries({ queryKey: ['muted', username] });
      queryClient.invalidateQueries({ queryKey: ['followingData', otherUsername] });
      queryClient.invalidateQueries({ queryKey: ['followingData', username] });
      queryClient.invalidateQueries({ queryKey: ['followersData', otherUsername] });
      queryClient.invalidateQueries({ queryKey: ['profileData', username] });
      queryClient.invalidateQueries({ queryKey: ['profileData', otherUsername] });

      logger.info('useUnfollowMutation onSuccess data: %o', data);
    }
  });

  return unfollowMutation;
}

/**
 * Makes follow blacklistblog transaction.
 *
 * @export
 * @return {*}
 */
