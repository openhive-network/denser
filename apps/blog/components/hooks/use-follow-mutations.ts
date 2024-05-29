import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/utils';
const logger = getLogger('app');

interface FollowParams {
  username: string;
}

/**
 * Makes follow transaction.
 *
 * @export
 * @return {*}
 */
export function useFollowMutation() {
  const followMutation = useMutation({
    mutationFn: async (params: FollowParams) => {
      const { username } = params;

      await transactionService.follow(username);

      logger.info('Followed: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useFollowMutation onSuccess data: %o', data);
    }
  });

  const follow = async (params: FollowParams) => {
    try {
      await followMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'follow', ...params });
    }
  };

  return { follow, followMutation };
}

interface UnfollowParams {
  username: string;
}

/**
 * Makes unfollow transaction.
 *
 * @export
 * @return {*}
 */
export function useUnfollowMutation() {
  const unfollowMutation = useMutation({
    mutationFn: async (params: UnfollowParams) => {
      const { username } = params;

      await transactionService.unfollow(username);

      logger.info('Unfollow: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useUnfollowMutation onSuccess data: %o', data);
    }
  });

  const unfollow = async (params: UnfollowParams) => {
    try {
      await unfollowMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'unfollow', ...params });
    }
  };

  return { unfollow, unfollowMutation };
}

interface FollowBlackListBlogParams {
  otherBlogs: string;
  blog?: string;
}

/**
 * Makes follow blacklistblog transaction.
 *
 * @export
 * @return {*}
 */
export function useFollowBlacklistBlogMutation() {
  const followBlacklistBlogMutation = useMutation({
    mutationFn: async (params: FollowBlackListBlogParams) => {
      const { otherBlogs, blog } = params;

      await transactionService.followBlacklistBlog(otherBlogs, blog);

      logger.info('Followed blacklist blog: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useFollowBlacklistBlogMutation onSuccess data: %o', data);
    }
  });

  const followBlacklistBlog = async (params: FollowBlackListBlogParams) => {
    try {
      await followBlacklistBlogMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'followBlacklistBlog', ...params });
    }
  };

  return { followBlacklistBlog, followBlacklistBlogMutation };
}

interface UnfollowBlacklistBlogParams {
  blog: string;
}

/**
 * Makes unfollow blacklistblog transaction.
 *
 * @export
 * @return {*}
 */
export function useUnfollowBlacklistBlogMutation() {
  const unfollowBlacklistBlogMutation = useMutation({
    mutationFn: async (params: UnfollowBlacklistBlogParams) => {
      const { blog } = params;

      await transactionService.unfollowBlacklistBlog(blog);

      logger.info('Unollowed blacklist blog: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useUnfollowBlacklistBlogMutation onSuccess data: %o', data);
    }
  });

  const unfollowBlacklistBlog = async (params: UnfollowBlacklistBlogParams) => {
    try {
      await unfollowBlacklistBlogMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'unfollowBlacklistBlog', ...params });
    }
  };

  return { unfollowBlacklistBlog, unfollowBlacklistBlogMutation };
}

/**
 * Makes follow muted transaction.
 *
 * @export
 * @return {*}
 */
export function useFollowMutedBlogMutation() {
  const followMutedBlogMutation = useMutation({
    mutationFn: async (params: FollowBlackListBlogParams) => {
      const { otherBlogs, blog } = params;

      await transactionService.followMutedBlog(otherBlogs, blog);

      logger.info('Followed muted blog: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useFollowMutedBlogMutation onSuccess data: %o', data);
    }
  });

  const followMutedBlog = async (params: FollowBlackListBlogParams) => {
    try {
      await followMutedBlogMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'followMutedBlog', ...params });
    }
  };

  return { followMutedBlog, followMutedBlogMutation };
}

/**
 * Makes unfollow muted transaction.
 *
 * @export
 * @return {*}
 */
export function useUnfollowMutedBlogMutation() {
  const unfollowMutedBlogMutation = useMutation({
    mutationFn: async (params: UnfollowBlacklistBlogParams) => {
      const { blog } = params;

      await transactionService.unfollowMutedBlog(blog);

      logger.info('Unollowed muted blog: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useUnfollowMutedBlogMutation onSuccess data: %o', data);
    }
  });

  const unfollowMutedBlog = async (params: UnfollowBlacklistBlogParams) => {
    try {
      await unfollowMutedBlogMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'unfollowMutedBlog', ...params });
    }
  };

  return { unfollowMutedBlog, unfollowMutedBlogMutation };
}
