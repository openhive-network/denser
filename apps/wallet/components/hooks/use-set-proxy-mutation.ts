import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';

/** Set proxy witness transaction. */
export function useSetProxyMutation() {
  const { username } = useUserClient().user;
  return useOperationMutation({
    name: 'useSetProxyMutation',
    run: ({ witness }: { witness: string }) => transactionService.witnessProxy(witness, OBSERVE),
    invalidate: () => [['listWitnessVotesData'], ['accountData', username], ['witnesses']],
    reportErrors: false
  });
}
