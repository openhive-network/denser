import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { logger } from '@ui/lib/logger';

/**
 * Set proxy witness transaction.
 *
 * @export
 * @returns
 */
export function useSetProxyMutation() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  const setProxyMutation = useMutation({
    mutationFn: async (params: { witness: string }) => {
      const { witness } = params;
      const broadcastResult = await transactionService.witnessProxy(witness, {
        observe: true
      });
      const response = { ...params, broadcastResult };
      logger.info('Done set proxy: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('setProxyMutation onSuccess data: %o', data);
      queryClient.invalidateQueries({
        queryKey: ['listWitnessVotesData']
      });
      queryClient.invalidateQueries({
        queryKey: ['accountData', user.username]
      });
      queryClient.invalidateQueries({
        queryKey: ['witnesses']
      });
    }
  });

  return setProxyMutation;
}
