import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Pin/Unpin posts in community.
 *
 * @export
 * @return {*}
 */
export function usePinMutation() {
  const queryClient = useQueryClient();
  const pinMutation = useMutation({
    mutationFn: async (params: { community: string; username: string; permlink: string }) => {
      const { community, username, permlink } = params;
      const broadcastResult = await transactionService.pin(community, username, permlink, {
        observe: true
      });
      const response = { ...params, broadcastResult };
      logger.info('Done pin transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('usePinMutation onSuccess data: %o', data);
      const { permlink } = data;
      queryClient.invalidateQueries({ queryKey: ['discussionData', permlink] });
    }
  });

  return pinMutation;
}

export function useUnpinMutation() {
  const queryClient = useQueryClient();
  const unpinMutation = useMutation({
    mutationFn: async (params: { community: string; username: string; permlink: string }) => {
      const { community, username, permlink } = params;
      const broadcastResult = await transactionService.unpin(community, username, permlink, {
        observe: true
      });
      const response = { ...params, broadcastResult };
      logger.info('Done unpin transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useUnpinMutation onSuccess data: %o', data);
      const { permlink } = data;
      queryClient.invalidateQueries({ queryKey: ['discussionData', permlink] });
    }
  });

  return unpinMutation;
}
