import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes follow blacklistblog transaction.
 *
 * @export
 * @return {*}
 */
export function useFollowBlacklistBlogMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const followBlacklistBlogMutation = useMutation({
    mutationFn: async (params: { otherBlogs: string; blog?: string }) => {
      const { otherBlogs, blog } = params;
      const broadcastResult = await transactionService.followBlacklistBlog(otherBlogs, blog, {
        observe: true
      });
      const response = { ...params, broadcastResult };
      logger.info('Done follow blacklist blog transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['follow_blacklist', username] });
      logger.info('useFollowBlacklistBlogMutation onSuccess data: %o', data);
    }
  });

  return followBlacklistBlogMutation;
}

/**
 * Makes unfollow blacklistblog transaction.
 *
 * @export
 * @return {*}
 */
export function useUnfollowBlacklistBlogMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const unfollowBlacklistBlogMutation = useMutation({
    mutationFn: async (params: { blog: string }) => {
      const { blog } = params;
      const broadcastResult = await transactionService.unfollowBlacklistBlog(blog, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done unfollow blacklist blog transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['follow_blacklist', username] });
      logger.info('useUnfollowBlacklistBlogMutation onSuccess data: %o', data);
    }
  });

  return unfollowBlacklistBlogMutation;
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
