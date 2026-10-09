import { asset } from '@hiveio/wax';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import {
  OBSERVE,
  useOperationMutation,
  withBroadcastResult
} from '@ui/components/hooks/use-operation-mutation';

type TransferParams = { fromAccount: string; toAccount: string; memo: string; amount: asset };
type WithdrawParams = TransferParams & { requestId: number };

const accountKeys = ({ fromAccount }: TransferParams) => [
  ['accountHistory', fromAccount],
  ['accountData', fromAccount]
];

/** Makes transfer transaction. */
export const useTransferHiveMutation = () =>
  useOperationMutation({
    name: 'useTransferHiveMutation',
    run: withBroadcastResult(({ amount, fromAccount, memo, toAccount }: TransferParams) =>
      transactionService.transfer(amount, fromAccount, memo, toAccount, OBSERVE)
    ),
    invalidate: accountKeys,
    reportErrors: false
  });

/** Makes transfer to savings transaction. */
export const useTransferToSavingsMutation = () =>
  useOperationMutation({
    name: 'useTransferToSavingsMutation',
    run: withBroadcastResult(({ amount, fromAccount, memo, toAccount }: TransferParams) =>
      transactionService.transferToSavings(amount, fromAccount, memo, toAccount, OBSERVE)
    ),
    invalidate: accountKeys,
    reportErrors: false
  });

/** Makes transfer from savings transaction. */
export function useWithdrawFromSavingsMutation() {
  const { username } = useUserClient().user;
  return useOperationMutation({
    name: 'useWithdrawFromSavingsMutation',
    run: withBroadcastResult(({ amount, fromAccount, memo, toAccount, requestId }: WithdrawParams) =>
      transactionService.transferFromSavings(amount, fromAccount, memo, toAccount, requestId, OBSERVE)
    ),
    invalidate: (params: WithdrawParams) => [['savingsWithdrawalsFrom', username], ...accountKeys(params)],
    reportErrors: false
  });
}
