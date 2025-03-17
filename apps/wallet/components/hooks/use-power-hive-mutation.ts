import { asset } from '@hiveio/wax';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { logger } from '@ui/lib/logger';

/**
 * Makes transfer to vesting transaction
 *
 * @export
 * @returns {*}
 */
export function usePowerUpMutation() {
  const queryClient = useQueryClient();
  const { user } = useUser();
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
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['accountData', username] });
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
  const queryClient = useQueryClient();
  const { user } = useUser();
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
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['accountData', username] });
      logger.info('usePowerDownMutation onSuccess data: %o', data);
    }
  });

  return powerDownMutation;
}

/**
 * Makes withdraw from vesting transaction to cancel power down
 *
 * @exports
 * @returns {*}
 */
export function useCancelPowerDownMutation() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const cancelPowerDownMutation = useMutation({
    mutationFn: async (params: { account: string }) => {
      const { account } = params;

      const chain = await hiveChainService.getHiveChain();
      const vestingShares = chain.vests(0);

      const broadcastResult = await transactionService.withdrawFromVesting(account, vestingShares, {
        observe: true
      });
      const response = { ...params, vestingShares, broadcastResult };
      logger.info('Done cancel power down transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['accountData', username] });
      logger.info('useCancelPowerDownMutation onSucces data: %o', data);
    }
  });

  return cancelPowerDownMutation;
}
