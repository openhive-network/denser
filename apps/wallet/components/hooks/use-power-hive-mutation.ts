import { asset } from '@hiveio/wax';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import type { TransactionBroadcastResult } from '@transaction/index';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import {
  OBSERVE,
  useOperationMutation,
  withBroadcastResult
} from '@ui/components/hooks/use-operation-mutation';
import { createAsset } from '@transaction/lib/utils';

type PowerUpParams = { fromAccount: string; toAccount: string; amount: asset };

/** Vesting mutation that refreshes the user's account data and history on settle. */
function useVestingMutation<TVariables extends object>(
  name: string,
  broadcast: (variables: TVariables) => Promise<TransactionBroadcastResult>
) {
  const { username } = useUserClient().user;
  return useOperationMutation({
    name,
    run: withBroadcastResult(broadcast),
    invalidate: () => [
      ['accountHistory', username],
      ['accountData', username]
    ],
    reportErrors: false
  });
}

/** Makes transfer to vesting transaction. */
export const usePowerUpMutation = () =>
  useVestingMutation('usePowerUpMutation', ({ amount, fromAccount, toAccount }: PowerUpParams) =>
    transactionService.transferToVesting(amount, fromAccount, toAccount, OBSERVE)
  );

/** Makes withdraw from vesting transaction. */
export const usePowerDownMutation = () =>
  useVestingMutation('usePowerDownMutation', ({ account, hp }: { account: string; hp: asset }) =>
    transactionService.withdrawFromVesting(account, hp, OBSERVE)
  );

/** Cancels a power down by withdrawing zero vesting shares. */
export const useCancelPowerDownMutation = () =>
  useVestingMutation('useCancelPowerDownMutation', async ({ account }: { account: string }) =>
    transactionService.withdrawFromVesting(account, await createAsset('0', 'HIVE'), OBSERVE)
  );
