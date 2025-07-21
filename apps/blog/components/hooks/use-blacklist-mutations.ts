import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes blacklist blog transaction.
 *
 * @export
 * @return {*}
 */
export function useBlacklistBlogMutation() {
  const { user } = useUser();

  const queryClient = useQueryClient();
  const blacklistBlogMutation = useMutation({
    mutationFn: async (params: { otherBlogs: string; blog?: string }) => {
      const { otherBlogs, blog } = params;
      const broadcastResult = await transactionService.blacklistBlog(otherBlogs, blog, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done blacklist blog transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useBlacklistBlogMutation onSuccess data: %o', data);
      const { username } = user;
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['blacklisted', username] });
      }, 3000);
    }
  });

  return blacklistBlogMutation;
}

/**
 * Makes unblacklist blog transaction.
 *
 * @export
 * @return {*}
 */
export function useUnblacklistBlogMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const unblacklistBlogMutation = useMutation({
    mutationFn: async (params: { blog: string }) => {
      const { blog } = params;
      const broadcastResult = await transactionService.unblacklistBlog(blog, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done unblacklist blog transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useUnblacklistBlogMutation onSuccess data: %o', data);
      const { username } = user;
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['blacklisted', username] });
      }, 3000);
    }
  });

  return unblacklistBlogMutation;
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
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['blacklisted', username] });
      }, 3000);
      logger.info('useResetBlacklistBlogMutation onSuccess: %o', data);
    }
  });

  return resetBlacklistBlogMutation;
}
