import { asset } from '@hiveio/wax';
import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { logger } from '@ui/lib/logger';

/**
 * Makes delegate transaction.
 *
 * @export
 * @returns
 */
export function useDelegateMutation() {
  const delegateMutation = useMutation({
    mutationFn: async (params: { delegator: string; delegatee: string; vestingShares: asset }) => {
      const { delegatee, delegator, vestingShares } = params;
      const broadcastResult = await transactionService.delegateVestingShares(
        delegator,
        delegatee,
        vestingShares,
        { observe: true }
      );
      const response = { ...params, broadcastResult };
      logger.info('Done delegate vesting shares transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useDelegateMutation onSuccess data: %o', data);
    }
  });

  return delegateMutation;
}
