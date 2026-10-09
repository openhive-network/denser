import { AccountAuthorityUpdateOperation } from '@hiveio/wax';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { useOperationMutation } from '@ui/components/hooks/use-operation-mutation';

export function useUpdateAuthorityOperationMutation() {
  const { username } = useUserClient().user;
  return useOperationMutation({
    name: 'useUpdateAuthorityOperationMutation',
    run: (operations: AccountAuthorityUpdateOperation) =>
      transactionService.updateAuthority(operations, {
        observe: true,
        singleSignKeyType: operations.role('owner').changed ? 'owner' : undefined
      }),
    invalidate: () => [['authority', username]],
    reportErrors: false
  });
}
