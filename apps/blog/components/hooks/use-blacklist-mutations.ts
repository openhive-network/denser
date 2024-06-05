import { useMutation } from '@tanstack/react-query';
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
    }
  });

  return unblacklistBlogMutation;
}
