import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/utils';
const logger = getLogger('app');

/**
 * Makes reset blog list transaction.
 *
 * @export
 * @return {*}
 */
export function useResetBlogListMutation() {
  const resetBlogListMutation = useMutation({
    mutationFn: async () => {
      await transactionService.resetBlogList();

      logger.info('Reset blog list');
    },
    onSuccess: () => {
      logger.info('useResetBlogListMutation onSuccess');
    }
  });

  const resetBlogList = async () => {
    try {
      await resetBlogListMutation.mutateAsync();
    } catch (error) {
      handleError(error, { method: 'resetBlogList' });
    }
  };

  return { resetBlogList, resetBlogListMutation };
}

/**
 * Makes reset blacklist blog transaction.
 *
 * @export
 * @return {*}
 */
export function useResetBlacklistBlogMutation() {
  const resetBlacklistBlogMutation = useMutation({
    mutationFn: async () => {
      await transactionService.resetBlacklistBlog();

      logger.info('Reset blacklist blog');
    },
    onSuccess: () => {
      logger.info('useResetBlacklistBlogMutation onSuccess');
    }
  });

  const resetBlacklistBlog = async () => {
    try {
      await resetBlacklistBlogMutation.mutateAsync();
    } catch (error) {
      handleError(error, { method: 'resetBlacklistBlog' });
    }
  };

  return { resetBlacklistBlog, resetBlacklistBlogMutation };
}

/**
 * Makes reset follow blacklist blog transaction.
 *
 * @export
 * @return {*}
 */
export function useResetFollowBlacklistBlogMutation() {
  const resetFollowBlacklistBlogMutation = useMutation({
    mutationFn: async () => {
      await transactionService.resetFollowBlacklistBlog();

      logger.info('Reset follow blacklist blog');
    },
    onSuccess: () => {
      logger.info('useResetFollowBlacklistBlogMutation onSuccess');
    }
  });

  const resetFollowBlacklistBlog = async () => {
    try {
      await resetFollowBlacklistBlogMutation.mutateAsync();
    } catch (error) {
      handleError(error, { method: 'resetFollowBlacklistBlog' });
    }
  };

  return { resetFollowBlacklistBlog, resetFollowBlacklistBlogMutation };
}

/**
 * Makes reset follow muted blog transaction.
 *
 * @export
 * @return {*}
 */
export function useResetFollowMutedBlogMutation() {
  const resetFollowMutedBlogMutation = useMutation({
    mutationFn: async () => {
      await transactionService.resetFollowMutedBlog();

      logger.info('Reset follow muted blog');
    },
    onSuccess: () => {
      logger.info('useResetFollowMutedBlogMutation onSuccess');
    }
  });

  const resetFollowMutedBlog = async () => {
    try {
      await resetFollowMutedBlogMutation.mutateAsync();
    } catch (error) {
      handleError(error, { method: 'resetFollowMutedBlog' });
    }
  };

  return { resetFollowMutedBlog, resetFollowMutedBlogMutation };
}
