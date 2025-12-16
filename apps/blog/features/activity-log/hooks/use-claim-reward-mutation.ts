import { ApiAccount } from '@hiveio/wax';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { getLogger } from '@ui/lib/logging';
import { FullAccount } from '@transaction/lib/app-types';
import { toast } from '@ui/components/hooks/use-toast';
import { handleError } from '@ui/lib/handle-error';
const logger = getLogger('app');

/**
 * Makes claim reward transaction.
 *
 * @export
 * @return {*}
 */
export function useClaimRewardsMutation() {
  const queryClient = useQueryClient();
  const { user } = useUserClient();
  const queryKey = ['profileData', user.username];
  const claimRewardMutation = useMutation({
    mutationFn: async (params: { account: ApiAccount }) => {
      const { account } = params;

      const broadcstResult = await transactionService.claimRewards(account, { observe: true });
      const prevData: FullAccount | undefined = queryClient.getQueryData(queryKey);
      const response = { ...params, broadcstResult, prevData };

      logger.info('Done claim reward tranasaction: %o', response);
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { prevData } = data;
      if (prevData) {
        queryClient.setQueryData(queryKey, () => ({
          ...prevData,
          reward_hbd_balance: '0.000 HBD',
          reward_hive_balance: '0.000 HIVE',
          reward_vesting_hive: '0.000 HIVE'
        }));
      }
    },
    onSuccess: (data) => {
      logger.info('useClaimRewardMutation onSuccess data: %o', data);
      toast({
        title: 'Claim rewards',
        description: 'Your rewards have been claimed successfully.',
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 6000);
    },
    onError: (error: any, variables) => {
      handleError(error, {
        method: 'useClaimRewardsMutation',
        params: variables
      });
    }
  });

  return claimRewardMutation;
}
