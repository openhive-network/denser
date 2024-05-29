import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TransactionBroadcastResult, transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/utils';
const logger = getLogger('app');

interface ReblogParams {
  author: string;
  permlink: string;
  username: string;
}

/**
 * Makes reblog transaction.
 *
 * @export
 * @return {*}
 */
export function useReblogMutation() {
  const queryClient = useQueryClient();
  const reblogMutation = useMutation({
    mutationFn: async (params: ReblogParams) => {
      const { author, permlink, username } = params;

      const broadcastResult: TransactionBroadcastResult = await transactionService.reblog(author, permlink, {
        observe: true
      });
      const response = { author, permlink, username, broadcastResult };
      logger.info('Done reblog transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useReblogMutation onSuccess data: %o', data);
      const { author, permlink, username } = data;
      queryClient.invalidateQueries({ queryKey: ['PostRebloggedBy', author, permlink, username] });
    }
  });

  const reblog = async (params: ReblogParams) => {
    try {
      await reblogMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'reblog', ...params });
    }
  };

  return { reblog, reblogMutation };
}
