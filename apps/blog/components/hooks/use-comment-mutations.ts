import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const commentMutation = useMutation({
    mutationFn: async (params: {
      parentAuthor: string;
      parentPermlink: string;
      body: string;
      preferences: Preferences;
      denserEditor: boolean;
    }) => {
      const { parentAuthor, parentPermlink, body, preferences, denserEditor } = params;
      const broadcastResult = await transactionService.comment(
        parentAuthor,
        parentPermlink,
        body,
        preferences,
        denserEditor,
        { observe: true }
      );
      const response = { ...params, broadcastResult };
      logger.info('Done comment transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useCommentMutation onSuccess data: %o', data);
      queryClient.invalidateQueries({ queryKey: ['discussionData'] });
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
  const queryClient = useQueryClient();
  const { user } = useUser();
  const updateCommentMutation = useMutation({
    mutationFn: async (params: {
      parentAuthor: string;
      parentPermlink: string;
      permlink: string;
      body: string;
    }) => {
      const { parentAuthor, parentPermlink, permlink, body } = params;
      const broadcastResult = await transactionService.updateComment(
        parentAuthor,
        parentPermlink,
        permlink,
        body,
        {
          observe: true
        }
      );
      const response = { ...params, broadcastResult };
      logger.info('Done update comment transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      const { permlink } = data;
      logger.info('useUpdateCommentMutation onSuccess data: %o', data);
      queryClient.invalidateQueries({ queryKey: ['discussionData'] });
      queryClient.invalidateQueries({ queryKey: ['postData', username, permlink] });
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
  const queryClient = useQueryClient();
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
      queryClient.invalidateQueries({ queryKey: ['discussionData'] });
    }
  });

  return deleteCommentMutation;
}
