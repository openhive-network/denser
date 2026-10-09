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

/**
 * HBD satoshis that `hive` HIVE satoshis are worth at the price `base` HBD satoshis per `quote`
 * HIVE satoshis (e.g. a feed's `current_median_history`): `hive * base / quote` in integer math,
 * rounded toward zero, as wax's `hiveToHbd` computes it.
 */
export function hiveToHbdSatoshis(hive: bigint, base: bigint, quote: bigint): bigint {
  return (hive * base) / quote;
}
