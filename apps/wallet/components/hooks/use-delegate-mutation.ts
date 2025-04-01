import { asset, TNaiAssetSource } from '@hiveio/wax';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
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
    mutationFn: async (params: {
      delegator: string;
      delegatee: string;
      hp: asset;
      totalVestingFundHive: TNaiAssetSource;
      totalVestingShares: TNaiAssetSource;
    }) => {
      const { delegatee, delegator, hp, totalVestingFundHive, totalVestingShares } = params;
      const chain = await hiveChainService.getHiveChain();
      const vestsAmount = chain.hpToVests(hp, totalVestingFundHive, totalVestingShares);
      const broadcastResult = await transactionService.delegateVestingShares(
        delegator,
        delegatee,
        vestsAmount,
        {
          observe: true
        }
      );
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
