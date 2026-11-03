import { describeError } from './describe-error';

/**
 * Why the node rejected a transaction's expiration: `expired` when it had already passed,
 * `too_far_ahead` when it was later than the node accepts (a client clock or expiration-setting problem).
 */
export type TransactionExpirationRejection = 'expired' | 'too_far_ahead';

// hived rejects a transaction whose expiration has passed, or is too far ahead, with the same
// `transaction_expiration_exception` ("transaction expiration exception"); wax carries it, often as a
// WaxUnhandledAssertionError, in its message.
const TRANSACTION_EXPIRATION_PATTERN = /transaction_expiration_exception|transaction expiration exception/i;
// The too-far-ahead assertion (`trx.expiration <= now + HIVE_MAX_TIME_UNTIL_[SIGNATURE_]EXPIRATION`)
// carries `max_til_exp` in its data; the passed one (`now < trx.expiration`) does not.
const EXPIRATION_TOO_FAR_AHEAD_PATTERN = /trx\.expiration\s*<=\s*now|HIVE_MAX_TIME_UNTIL_(?:SIGNATURE_)?EXPIRATION|max_til_exp/;

/**
 * How the node rejected a broadcast's expiration, or null when `error` is not such a rejection.
 * A rejection naming neither assertion is taken for `expired`, the usual case: the signer returned
 * the transaction only after its expiration. Nothing was applied either way.
 */
export function findTransactionExpirationRejection(error: unknown): TransactionExpirationRejection | null {
  const text = describeError(error);
  if (!TRANSACTION_EXPIRATION_PATTERN.test(text)) return null;
  return EXPIRATION_TOO_FAR_AHEAD_PATTERN.test(text) ? 'too_far_ahead' : 'expired';
}
