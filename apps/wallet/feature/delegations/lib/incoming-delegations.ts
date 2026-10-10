import type { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import type { BalanceApiIncomingDelegation } from '@hive/common-hiveio-packages/wax';
import { vestsToHiveSatoshis } from '@ui/lib/asset-math';

const BLOCK_INTERVAL_MS = 3_000;

export type IncomingDelegationChainState = Pick<
  GetDynamicGlobalPropertiesResponse,
  'total_vesting_fund_hive' | 'total_vesting_shares' | 'head_block_number' | 'time'
>;

export interface IncomingDelegationRow {
  delegator: string;
  /** HIVE satoshis the delegated VESTS are worth at the current vesting totals */
  hiveSatoshis: bigint;
  /**
   * When the delegation last changed, estimated from its block at one block per 3 s back from the
   * head block: missed blocks make it slightly later than the real time.
   */
  since: Date;
}

const byAmountDescending = (a: BalanceApiIncomingDelegation, b: BalanceApiIncomingDelegation): number => {
  const difference = BigInt(b.amount) - BigInt(a.amount);
  if (difference !== 0n) return difference > 0n ? 1 : -1;
  return a.delegator.localeCompare(b.delegator);
};

/** Incoming delegations with their HP and start time, largest first (ties by delegator name). */
export function toIncomingDelegationRows(
  delegations: BalanceApiIncomingDelegation[],
  chain: IncomingDelegationChainState
): IncomingDelegationRow[] {
  const totalVestingFund = BigInt(chain.total_vesting_fund_hive.amount);
  const totalVestingShares = BigInt(chain.total_vesting_shares.amount);
  const headBlockTime = new Date(`${chain.time}Z`).getTime();
  return [...delegations].sort(byAmountDescending).map((delegation) => ({
    delegator: delegation.delegator,
    hiveSatoshis: vestsToHiveSatoshis(BigInt(delegation.amount), totalVestingFund, totalVestingShares),
    since: new Date(headBlockTime - (chain.head_block_number - delegation.block_num) * BLOCK_INTERVAL_MS)
  }));
}
