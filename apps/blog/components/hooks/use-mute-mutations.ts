import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  const { user } = useUser();
  const queryClient = useQueryClient();
  const muteMutation = useMutation({
    mutationFn: async (params: { username: string }) => {
      const { username } = params;
      const broadcastResult = await transactionService.mute(username, '', { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done mute transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['muted', username] });
      queryClient.invalidateQueries({ queryKey: ['followingData', username, ['ignore']] });

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
  const { user } = useUser();
  const queryClient = useQueryClient();
  const unmuteMutation = useMutation({
    mutationFn: async (params: { username: string }) => {
      const { username } = params;
      const broadcastResult = await transactionService.unmute(username, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done unmute transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['muted', username] });
      queryClient.invalidateQueries({ queryKey: ['followingData', username, ['ignore']] });

      logger.info('useUnmuteMutation onSuccess data: %o', data);
    }
  });

  return unmuteMutation;
}
