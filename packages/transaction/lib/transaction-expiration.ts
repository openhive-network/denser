/**
 * The expiration a transaction is built with, as wax's offset from the head block's time. A signer asks
 * for the key, or opens its extension's window, only after the transaction is built: the offset is how
 * long the user has to approve it, well inside hived's `HIVE_MAX_TIME_UNTIL_EXPIRATION` of an hour.
 */
export const TRANSACTION_EXPIRATION = '+10m';

/**
 * The time a transaction's `expiration` (hived's UTC timestamp without a zone, `2026-11-07T02:06:13`)
 * names, or undefined when it cannot be read.
 */
export function readTransactionExpiration(expiration: string | undefined): Date | undefined {
  if (!expiration) return undefined;
  const date = new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(expiration) ? expiration : `${expiration}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
