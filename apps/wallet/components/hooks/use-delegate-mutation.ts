import { asset } from '@hiveio/wax';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import {
  OBSERVE,
  useOperationMutation,
  withBroadcastResult
} from '@ui/components/hooks/use-operation-mutation';

type DelegateParams = { delegator: string; delegatee: string; hp: asset };

/** Makes delegate vesting shares transaction. */
export const useDelegateMutation = () =>
  useOperationMutation({
    name: 'useDelegateMutation',
    run: withBroadcastResult(({ delegator, delegatee, hp }: DelegateParams) =>
      transactionService.delegateVestingShares(delegator, delegatee, hp, OBSERVE)
    ),
    invalidate: ({ delegator }: DelegateParams) => [
      ['vestingDelegation', delegator],
      ['expiringVestingDelegations', delegator]
    ],
    reportErrors: false
  });
