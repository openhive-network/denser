import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/utils';
const logger = getLogger('app');

interface BlackListBlogParams {
  otherBlogs: string;
  blog?: string;
}

/**
 * Makes blacklist blog transaction.
 *
 * @export
 * @return {*}
 */
export function useBlacklistBlogMutation() {
  const blacklistBlogMutation = useMutation({
    mutationFn: async (params: BlackListBlogParams) => {
      const { otherBlogs, blog } = params;

      await transactionService.blacklistBlog(otherBlogs, blog, { observe: true });

      logger.info('Blacklist blog: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useBlacklistBlogMutation onSuccess data: %o', data);
    }
  });

  const blacklistBlog = async (params: BlackListBlogParams) => {
    try {
      await blacklistBlogMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'blacklistBlog', ...params });
    }
  };

  return { blacklistBlog, blacklistBlogMutation };
}

interface UnblacklistBlogParams {
  blog: string;
}

/**
 * Makes unblacklist blog transaction.
 *
 * @export
 * @return {*}
 */
export function useUnblacklistBlogMutation() {
  const unblacklistBlogMutation = useMutation({
    mutationFn: async (params: UnblacklistBlogParams) => {
      const { blog } = params;

      await transactionService.unblacklistBlog(blog, { observe: true });

      logger.info('Unblacklist blog: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useUnblacklistBlogMutation onSuccess data: %o', data);
    }
  });

  const unblacklistBlog = async (params: UnblacklistBlogParams) => {
    try {
      await unblacklistBlogMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'unblacklistBlog', ...params });
    }
  };

  return { unblacklistBlog, unblacklistBlogMutation };
}
