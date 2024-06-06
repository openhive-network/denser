import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes mute transaction.
 *
 * @export
 * @return {*}
 */
export function useMuteMutation() {
  const muteMutation = useMutation({
    mutationFn: async (params: { username: string }) => {
      const { username } = params;
      const broadcastResult = await transactionService.mute(username, '', { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done mute transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useMuteMutation onSuccess data: %o', data);
    }
  });

  return muteMutation;
}

/**
 * Makes unmute transaction.
 *
 * @export
 * @return {*}
 */
export function useUnmuteMutation() {
  const unmuteMutation = useMutation({
    mutationFn: async (params: { username: string }) => {
      const { username } = params;
      const broadcastResult = await transactionService.unmute(username, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done unmute transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useUnmuteMutation onSuccess data: %o', data);
    }
  });

  return unmuteMutation;
}
