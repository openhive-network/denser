import { asset } from '@hiveio/wax';
import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { logger } from '@ui/lib/logger';

/**
 * Makes transfer to vesting transaction
 *
 * @export
 * @returns {*}
 */
export function usePowerUpMutation() {
  const powerUpMutation = useMutation({
    mutationFn: async (params: { account: string; amount: asset }) => {
      const { amount, account } = params;
      const broadcastResult = await transactionService.transferToVesting(amount, account, account, {
        observe: true
      });
      const response = { ...params, broadcastResult };
      logger.info('Done transfer to vesting transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('usePowerUpMutation onSuccess data: %o', data);
    }
  });

  return powerUpMutation;
}

/**
 * Makes withdraw from vesting transaction
 *
 * @exports
 * @returns {*}
 */
export function usePowerDownMutation() {
  const powerDownMutation = useMutation({
    mutationFn: async (params: { account: string; vestingShares: asset }) => {
      const { account, vestingShares } = params;
      const broadcastResult = await transactionService.withdrawFromVesting(account, vestingShares, {
        observe: true
      });
      const response = { ...params, broadcastResult };
      logger.info('Done withdraw from vesting trasaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('usePowerDownMutation onSuccess data: %o', data);
    }
  });

  return powerDownMutation;
}
