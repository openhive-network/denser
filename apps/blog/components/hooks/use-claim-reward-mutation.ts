import { ApiAccount } from '@hiveio/wax';
import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes claim reward transaction.
 *
 * @export
 * @return {*}
 */
export function useClaimRewardMutation() {
  const claimRewardMutation = useMutation({
    mutationFn: async (params: { account: ApiAccount }) => {
      const { account } = params;
      const broadcstResult = await transactionService.claimRewards(account, { observe: true });
      const response = { ...params, broadcstResult };
      logger.info('Done claime reward tranasaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useClaimRewardMutation onSuccess data: %o', data);
    }
  });

  return claimRewardMutation;
}
