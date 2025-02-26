import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes subscribe transaction.
 *
 * @export
 * @return {*}
 */
export function useSubscribeMutation() {
  const queryClient = useQueryClient();
  const subscribeMutation = useMutation({
    mutationFn: async (params: { community: string, username: string }) => {
      const { community } = params;
      const broadcastResult = await transactionService.subscribe(community, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done subscribe transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useSubscribeMutation onSuccess data: %o', data);
      const { community, username } = data;
      queryClient.invalidateQueries({ queryKey: ['communitiesList'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', username] });
      queryClient.invalidateQueries({ queryKey: ['community', community] });
      queryClient.invalidateQueries({ queryKey: ['subscribers', community] });
      queryClient.invalidateQueries({ queryKey: ['AccountNotification', community]});
    }
  });

  return subscribeMutation;
}

/**
 * Makes unsubscribe transaction.
 *
 * @export
 * @return {*}
 */
export function useUnsubscribeMutation() {
  const queryClient = useQueryClient();
  const unsubscribeMutation = useMutation({
    mutationFn: async (params: { community: string, username: string }) => {
      const { community } = params;
      const broadcastResult = await transactionService.unsubscribe(community, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done unsubscribe transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useUnsubscribeMutation onSuccess data: %o', data);
      const { community, username } = data;
      queryClient.invalidateQueries({ queryKey: ['communitiesList'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', username] });
      queryClient.invalidateQueries({ queryKey: ['community', community] });
      queryClient.invalidateQueries({ queryKey: ['subscribers', community] });
      queryClient.invalidateQueries({ queryKey: ['AccountNotification', community]});
    }
  });

  return unsubscribeMutation;
}
