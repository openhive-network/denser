import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Preferences } from '@transaction/lib/app-types';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/utils';
import { subscribe } from 'diagnostics_channel';
const logger = getLogger('app');

interface SubscribeParams {
  username: string;
}

/**
 * Makes subscribe transaction.
 *
 * @export
 * @return {*}
 */
export function useSubscribeMutation() {
  const subscribeMutation = useMutation({
    mutationFn: async (params: SubscribeParams) => {
      const { username } = params;

      await transactionService.subscribe(username);

      logger.info('Subscribe: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useSubscribeMutation onSuccess data: %o', data);
    }
  });

  const subscribe = async (params: SubscribeParams) => {
    try {
      await subscribeMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'subscribe', ...params });
    }
  };

  return { subscribe, subscribeMutation };
}

/**
 * Makes unsubscribe transaction.
 *
 * @export
 * @return {*}
 */
export function useUnsubscribeMutation() {
  const unsubscribeMutation = useMutation({
    mutationFn: async (params: SubscribeParams) => {
      const { username } = params;

      await transactionService.unsubscribe(username);

      logger.info('Unsubscribe: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useUnsubscribeMutation onSuccess data: %o', data);
    }
  });

  const unsubscribe = async (params: SubscribeParams) => {
    try {
      await unsubscribeMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'unsubscribe', ...params });
    }
  };

  return { unsubscribe, unsubscribeMutation };
}
