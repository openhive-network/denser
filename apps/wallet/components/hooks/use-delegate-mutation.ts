import { asset, TNaiAssetSource } from '@hiveio/wax';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { logger } from '@ui/lib/logger';

/**
 * Makes delegate transaction.
 *
 * @export
 * @returns
 */
export function useDelegateMutation() {
  const queryClient = useQueryClient();

  const delegateMutation = useMutation({
    mutationFn: async (params: { delegator: string; delegatee: string; hp: asset }) => {
      const { delegatee, delegator, hp } = params;
      const broadcastResult = await transactionService.delegateVestingShares(delegator, delegatee, hp, {
        observe: true
      });
      const response = { ...params, broadcastResult };
      logger.info('Done delegate vesting shares transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { delegator } = data;
      queryClient.invalidateQueries({ queryKey: ['vestingDelegation', delegator] });
      logger.info('useDelegateMutation onSuccess data: %o', data);
    }
  });

  return delegateMutation;
}
