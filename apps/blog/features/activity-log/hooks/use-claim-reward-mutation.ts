import { ApiAccount } from '@hiveio/wax';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { FullAccount } from '@hive/common-hiveio-packages/wax';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';

const ZERO_HBD = { amount: '0', nai: '@@000000013', precision: 3 };
const ZERO_HIVE = { amount: '0', nai: '@@000000021', precision: 3 };

export function useClaimRewardsMutation() {
  const { user } = useUserClient();
  const queryKey = ['profileData', user.username];
  return useOperationMutation({
    name: 'useClaimRewardsMutation',
    run: ({ account }: { account: ApiAccount }) => transactionService.claimRewards(account, OBSERVE),
    onSuccess: (_data, _params, queryClient) => {
      const prevData: FullAccount | undefined = queryClient.getQueryData(queryKey);
      if (!prevData) return;
      queryClient.setQueryData(queryKey, {
        ...prevData,
        reward_hbd_balance: ZERO_HBD,
        reward_hive_balance: ZERO_HIVE,
        reward_vesting_hive: ZERO_HIVE
      });
    },
    successToast: () => ({
      title: 'Claim rewards',
      description: 'Your rewards have been claimed successfully.'
    }),
    invalidate: () => [queryKey],
    // The API has caught up by then; until then the component uses claimedBalances to suppress stale data.
    invalidateDelays: [60000]
  });
}
