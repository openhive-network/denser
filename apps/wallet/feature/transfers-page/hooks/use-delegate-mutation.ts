import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { useOperationMutation } from '@ui/components/hooks/use-operation-mutation';

export function useDelegateRCMutation() {
  const { username } = useUserClient().user;
  return useOperationMutation({
    name: 'useDelegateRCMutation',
    run: ({ toAccount, amount }: { toAccount: string; amount: string }) =>
      transactionService.delegateRC(username, amount, toAccount, {
        observe: true,
        requiredKeyType: 'posting'
      }),
    successToast: (_data, { amount, toAccount }) => ({
      description: `Successfully delegated ${amount} RC to ${toAccount}`
    }),
    invalidate: () => [['manabar', username]],
    reportErrors: false
  });
}
