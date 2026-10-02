/**
 * HIVE satoshis that `vests` VESTS satoshis are worth at the given vesting fund and vesting share
 * totals: `vests * totalVestingFundHive / totalVestingShares` in integer math, rounded toward zero,
 * as wax's `vestsToHp` computes it.
 */
export function vestsToHiveSatoshis(
  vests: bigint,
  totalVestingFundHive: bigint,
  totalVestingShares: bigint
): bigint {
  return (vests * totalVestingFundHive) / totalVestingShares;
}
