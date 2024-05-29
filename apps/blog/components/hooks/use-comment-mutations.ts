import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Preferences } from '@transaction/lib/app-types';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/utils';
const logger = getLogger('app');

interface CommentParams {
  parentAuthor: string;
  parentPermlink: string;
  body: string;
  preferences: Preferences;
}

/**
 * Makes comment transaction.
 *
 * @export
 * @return {*}
 */
export function useCommentMutation() {
  const commentMutation = useMutation({
    mutationFn: async (params: CommentParams) => {
      const { parentAuthor, parentPermlink, body, preferences } = params;

      await transactionService.comment(parentAuthor, parentPermlink, body, preferences);

      logger.info('Comment: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useCommentMutation onSuccess data: %o', data);
    }
  });

  const comment = async (params: CommentParams) => {
    try {
      await commentMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'comment', ...params });
    }
  };

  return { comment, commentMutation };
}

interface UpdateCommentParams {
  parentAuthor: string;
  parentPermlink: string;
  permlink: string;
  body: string;
  comment_rewards: '0%' | '50%' | '100%';
}

/**
 * Makes update comment transaction.
 *
 * @export
 * @return {*}
 */
export function useUpdateCommentMutation() {
  const updateCommentMutation = useMutation({
    mutationFn: async (params: UpdateCommentParams) => {
      const { parentAuthor, parentPermlink, permlink, body, comment_rewards } = params;

      await transactionService.updateComment(parentAuthor, parentPermlink, permlink, body, comment_rewards);

      logger.info('Update comment: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useUpdateCommentMutation onSuccess data: %o', data);
    }
  });

  const updateComment = async (params: UpdateCommentParams) => {
    try {
      await updateCommentMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'updateComment', ...params });
    }
  };

  return { updateComment, updateCommentMutation };
}

interface DeleteCommentParams {
  permlink: string;
}

/**
 * Makes delete comment transaction.
 *
 * @export
 * @return {*}
 */
export function useDeleteCommentMutation() {
  const deleteCommentMutation = useMutation({
    mutationFn: async (params: DeleteCommentParams) => {
      const { permlink } = params;

      await transactionService.deleteComment(permlink);

      logger.info('Deleted comment %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useDeleteCommentMutation onSuccess data: %o', data);
    }
  });

  const deleteComment = async (params: DeleteCommentParams) => {
    try {
      await deleteCommentMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'deleteComment', ...params });
    }
  };

  return { deleteComment, deleteCommentMutation };
}
