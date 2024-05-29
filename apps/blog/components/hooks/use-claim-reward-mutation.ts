import { ApiAccount } from '@hiveio/wax';
import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/utils';
const logger = getLogger('app');

interface ClaimRewardParams {
  account: ApiAccount;
}

/**
 * Makes claim reward transaction.
 *
 * @export
 * @return {*}
 */
export function useClaimRewardMutation() {
  const claimRewardMutation = useMutation({
    mutationFn: async (params: ClaimRewardParams) => {
      const { account } = params;

      await transactionService.claimRewards(account);

      logger.info('Claimed reward: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useClaimRewardMutation onSuccess data: %o', data);
    }
  });

  const claimReward = async (params: ClaimRewardParams) => {
    try {
      await claimRewardMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'claimReward', ...params });
    }
  };

  return { claimReward, claimRewardMutation };
}
