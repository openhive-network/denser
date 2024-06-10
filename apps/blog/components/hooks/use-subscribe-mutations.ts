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
    mutationFn: async (params: { username: string }) => {
      const { username } = params;
      const broadcastResult = await transactionService.subscribe(username, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done subscribe transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useSubscribeMutation onSuccess data: %o', data);
      const { username } = data;
      // ['communitiesList', sort, query, user.username]
      queryClient.invalidateQueries({ queryKey: ['communitiesList'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', username] });
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
    mutationFn: async (params: { username: string }) => {
      const { username } = params;
      const broadcastResult = await transactionService.unsubscribe(username, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done unsubscribe transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useUnsubscribeMutation onSuccess data: %o', data);
      const { username } = data;
      // ['communitiesList', sort, query, user.username]
      queryClient.invalidateQueries({ queryKey: ['communitiesList'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', username] });
    }
  });

  return unsubscribeMutation;
}
