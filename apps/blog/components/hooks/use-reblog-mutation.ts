import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TransactionBroadcastResult, transactionService } from '@transaction/index';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');


export function useReblogMutation() {
    const queryClient = useQueryClient();
    const reblogMutation = useMutation({
      mutationFn: async (params: {
            author: string,
            permlink: string,
            username: string
          }) => {
        const { author, permlink, username } = params;

        const broadcastResult: TransactionBroadcastResult = await transactionService.reblog(
            author,
            permlink,
            {
                onError: (error) => {
                    transactionService.handleError(error);
                    throw error;
                },
                observe: true
            }
        );
        const response = { author, permlink, username, broadcastResult };
        logger.info('Done reblog transaction: %o', response);
        return response;
      },
      onSuccess: (data) => {
        logger.info('useReblogMutation onSuccess data: %o', data);
        const { author, permlink, username } = data;
        queryClient.invalidateQueries(
          { queryKey: ['PostRebloggedBy', author, permlink, username] });
      },
    });
    return reblogMutation;
  };
