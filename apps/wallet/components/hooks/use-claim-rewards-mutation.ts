import { ApiAccount } from '@hiveio/wax';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { ACCOUNT_HISTORY_REFRESH_DELAYS } from '@/wallet/lib/constants';

export function useClaimRewardsMutation() {
  const { username } = useUserClient().user;
  return useOperationMutation({
    name: 'useClaimRewardsMutation',
    run: ({ account }: { account: ApiAccount }) =>
      transactionService.claimRewards(account, { observe: true, requiredKeyType: 'posting' }),
    invalidate: () => [
      ['profileData', username],
      ['accountData', username],
      ['accountHistory', username]
    ],
    invalidateDelays: ACCOUNT_HISTORY_REFRESH_DELAYS,
    reportErrors: false
  });
}
