import { useMutation } from '@tanstack/react-query';
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
  const resetBlogListMutation = useMutation({
    mutationFn: async () => {
      const broadcastResult = await transactionService.resetBlogList({ observe: true });
      const response = { broadcastResult };
      logger.info('Done reset blog list transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
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
  const resetBlacklistBlogMutation = useMutation({
    mutationFn: async () => {
      const broadcastResult = await transactionService.resetBlacklistBlog({ observe: true });
      const response = { broadcastResult };
      logger.info('Done reset blacklist blog transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
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
  const resetFollowBlacklistBlogMutation = useMutation({
    mutationFn: async () => {
      const broadcastResult = await transactionService.resetFollowBlacklistBlog({ observe: true });
      const response = { broadcastResult };
      logger.info('Done reset follow blacklist blog transactio: %o', response);
      return response;
    },
    onSuccess: (data) => {
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
  const resetFollowMutedBlogMutation = useMutation({
    mutationFn: async () => {
      const broadcastResult = await transactionService.resetFollowMutedBlog({ observe: true });
      const response = { broadcastResult };
      logger.info('Done reset follow muted blog transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useResetFollowMutedBlogMutation onSuccess: %o', data);
    }
  });

  return resetFollowMutedBlogMutation;
}
