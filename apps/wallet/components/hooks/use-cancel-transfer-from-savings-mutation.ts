import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { ACCOUNT_HISTORY_REFRESH_DELAYS } from '@/wallet/lib/constants';

export function useCancelTransferFromSavingsMutation() {
  const { username } = useUserClient().user;
  return useOperationMutation({
    name: 'useCancelTransferFromSavingsMutation',
    run: ({ fromAccount, requestId }: { fromAccount: string; requestId: number }) =>
      transactionService.cancelTransferFromSavings(fromAccount, requestId, OBSERVE),
    invalidate: () => [
      ['savingsWithdrawalsFrom', username],
      ['profileData', username],
      ['accountData', username],
      ['accountHistory', username]
    ],
    invalidateDelays: ACCOUNT_HISTORY_REFRESH_DELAYS,
    reportErrors: false
  });
}
