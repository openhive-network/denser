import { ApiAccount } from '@hiveio/wax';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes claim reward transaction.
 *
 * @export
 * @return {*}
 */
export function useClaimRewardMutation() {
  const queryClient = useQueryClient();
  const { user } = useUser();
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
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['profileData', username] });
    }
  });

  return claimRewardMutation;
}
