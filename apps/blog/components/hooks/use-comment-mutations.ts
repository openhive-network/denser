import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Preferences } from '@transaction/lib/app-types';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes comment transaction.
 *
 * @export
 * @return {*}
 */
export function useCommentMutation() {
  const commentMutation = useMutation({
    mutationFn: async (params: {
      parentAuthor: string;
      parentPermlink: string;
      body: string;
      preferences: Preferences;
    }) => {
      const { parentAuthor, parentPermlink, body, preferences } = params;
      const broadcastResult = await transactionService.comment(
        parentAuthor,
        parentPermlink,
        body,
        preferences,
        { observe: true }
      );
      const response = { ...params, broadcastResult };
      logger.info('Done comment transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useCommentMutation onSuccess data: %o', data);
    }
  });

  return commentMutation;
}

/**
 * Makes update comment transaction.
 *
 * @export
 * @return {*}
 */
export function useUpdateCommentMutation() {
  const updateCommentMutation = useMutation({
    mutationFn: async (params: {
      parentAuthor: string;
      parentPermlink: string;
      permlink: string;
      body: string;
      comment_rewards: '0%' | '50%' | '100%';
    }) => {
      const { parentAuthor, parentPermlink, permlink, body, comment_rewards } = params;
      const broadcastResult = await transactionService.updateComment(
        parentAuthor,
        parentPermlink,
        permlink,
        body,
        comment_rewards,
        {
          observe: true
        }
      );
      const response = { ...params, broadcastResult };
      logger.info('Done update comment transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useUpdateCommentMutation onSuccess data: %o', data);
    }
  });

  return updateCommentMutation;
}

/**
 * Makes delete comment transaction.
 *
 * @export
 * @return {*}
 */
export function useDeleteCommentMutation() {
  const deleteCommentMutation = useMutation({
    mutationFn: async (params: { permlink: string }) => {
      const { permlink } = params;
      const broadcastResult = await transactionService.deleteComment(permlink, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done delete comment transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useDeleteCommentMutation onSuccess data: %o', data);
    }
  });

  return deleteCommentMutation;
}
