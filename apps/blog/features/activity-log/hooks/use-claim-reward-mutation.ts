import { ApiAccount } from '@hiveio/wax';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { getLogger } from '@ui/lib/logging';
import { FullAccount } from '@hive/common-hiveio-packages/wax';
import { toast } from '@ui/components/hooks/use-toast';
import { handleError } from '@ui/lib/handle-error';
import { scheduleValidatedRefetch } from '@/blog/lib/react-query';
import { getAccountFull } from '@transaction/lib/hive-api';
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
          reward_hbd_balance: { amount: '0', nai: '@@000000013', precision: 3 },
          reward_hive_balance: { amount: '0', nai: '@@000000021', precision: 3 },
          reward_vesting_hive: { amount: '0', nai: '@@000000021', precision: 3 }
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
      // Use validated refetch instead of blind invalidateQueries.
      // Only updates cache when the API confirms rewards are actually zero,
      // preventing stale API responses from overwriting optimistic zeros.
      scheduleValidatedRefetch(
        queryClient,
        queryKey,
        () => getAccountFull(user.username),
        (freshData) =>
          freshData.reward_hive_balance.amount === '0' &&
          freshData.reward_hbd_balance.amount === '0' &&
          freshData.reward_vesting_hive.amount === '0'
      );
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
