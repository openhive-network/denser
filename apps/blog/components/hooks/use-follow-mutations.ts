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
  const followMutation = useMutation({
    mutationFn: async (params: { username: string }) => {
      const { username } = params;
      const broadcastResult = await transactionService.follow(username, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done follow transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
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
  const unfollowMutation = useMutation({
    mutationFn: async (params: { username: string }) => {
      const { username } = params;
      const broadcastResult = await transactionService.unfollow(username, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done unfollow transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
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
