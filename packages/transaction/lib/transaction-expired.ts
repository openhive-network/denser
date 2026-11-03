import { describeError } from './describe-error';

// hived rejects a transaction whose expiration has passed with `transaction_expiration_exception`
// ("transaction expiration exception"); wax carries it, often as a WaxUnhandledAssertionError, in its message.
const TRANSACTION_EXPIRED_PATTERN = /transaction_expiration_exception|transaction expiration exception/i;

/**
 * True when the node rejected a broadcast because the transaction had already expired, typically
 * because the signer returned it only after its expiration. Nothing was applied.
 */
export function isTransactionExpired(error: unknown): boolean {
  return TRANSACTION_EXPIRED_PATTERN.test(describeError(error));
}
