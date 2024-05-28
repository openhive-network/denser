import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

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

      await transactionService.deleteComment(permlink);

      logger.info('Deleted comment %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useDeleteCommentMutation onSuccess data: %o', data);
      // Invalidate queries
    }
  });

  return deleteCommentMutation;
}
