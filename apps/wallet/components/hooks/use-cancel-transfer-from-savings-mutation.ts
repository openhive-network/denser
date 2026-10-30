import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { ACCOUNT_HISTORY_REFRESH_DELAYS } from '@/wallet/lib/constants';

export function useCancelTransferFromSavingsMutation() {
  return useOperationMutation({
    name: 'useCancelTransferFromSavingsMutation',
    run: ({ fromAccount, requestId }: { fromAccount: string; requestId: number }) =>
      transactionService.cancelTransferFromSavings(fromAccount, requestId, OBSERVE),
    invalidate: ({ fromAccount }) => [
      ['savingsWithdrawalsFrom', fromAccount],
      ['profileData', fromAccount],
      ['accountData', fromAccount],
      ['accountHistory', fromAccount]
    ],
    invalidateDelays: ACCOUNT_HISTORY_REFRESH_DELAYS,
    reportErrors: false
  });
}
