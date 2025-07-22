import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { IFollowList } from '@transaction/lib/extended-hive.chain';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes follow muted transaction.
 *
 * @export
 * @return {*}
 */
export function useFollowMutedBlogMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const followMutedBlogMutation = useMutation({
    mutationFn: async (params: { otherBlogs: string; blog?: string }) => {
      const { otherBlogs, blog } = params;
      const broadcastResult = await transactionService.followMutedBlog(otherBlogs, blog, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done follow muted blog transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['follow_muted', username] });
      logger.info('useFollowMutedBlogMutation onSuccess data: %o', data);
    }
  });

  return followMutedBlogMutation;
}

/**
 * Makes unfollow muted transaction.
 *
 * @export
 * @return {*}
 */
export function useUnfollowMutedBlogMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const unfollowMutedBlogMutation = useMutation({
    mutationFn: async (params: { blog: string }) => {
      const { blog } = params;
      const broadcastResult = await transactionService.unfollowMutedBlog(blog, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done unfollow muted blog transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['follow_muted', username] });
      logger.info('useUnfollowMutedBlogMutation onSuccess data: %o', data);
    }
  });

  return unfollowMutedBlogMutation;
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
