import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { useOperationMutation } from '@ui/components/hooks/use-operation-mutation';

export function useUndelegateMutation() {
  const { username } = useUserClient().user;
  return useOperationMutation({
    name: 'useUndelegateMutation',
    run: (toAccount: string) =>
      transactionService.undelegateRC(username, toAccount, { observe: true, requiredKeyType: 'posting' }),
    successToast: (_data, toAccount) => ({ description: `Successfully undelegated RC from ${toAccount}` }),
    invalidate: () => [
      ['resourceCredits', username],
      ['manabar', username]
    ],
    reportErrors: false
  });
}
