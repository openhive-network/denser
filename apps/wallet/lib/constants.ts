export const REFUND_ACCOUNTS = ["steem.dao", "hive.fund"];
export const BURN_ACCOUNTS = ["null"];
export const DISABLED_SIGNING_KEY =
  "STM1111111111111111111111111111111114T1Anm";
/**
 * When (ms after an operation is included in a block) the account history is refetched: the
 * history API serves an operation only once its block is irreversible, which can take a while.
 */
export const ACCOUNT_HISTORY_REFRESH_DELAYS = [0, 15000, 45000, 90000];
