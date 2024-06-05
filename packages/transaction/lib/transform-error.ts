import { getLogger } from '@hive/ui/lib/logging';
import { WaxChainApiError } from '@hiveio/wax';
import { transactionService } from '@hive/transaction';
const logger = getLogger('app');

/**
 * Default error description, used when trying to get smarter
 * description fails
 */
const errorDescription = 'Transaction broadcast error';

/**
 * Strings to look for in error's stuff. When found, we can assume
 * that we caught well known error and we can use these strings in
 * message for user safely.
 */
const wellKnownErrorDescriptions = [
  'Your current vote on this comment is identical to this vote',
  'Account does not have enough mana to downvote',
  'You may only post once every 5 minutes'
];

/**
 * Return error description by trying to find a message for user in error stuff,
 * then swallow error
 *
 * @param {*} e
 * @param {{ method: string, params: T }} ctx
 * @returns error description
 */
export function transformError<T>(e: any, ctx?: { method: string; params: T }, defaultDescription?: string) {
  logger.error('Got error: %o on %o', e, ctx);
  const isError = (err: unknown): err is Error => err instanceof Error;
  const isWaxError = (err: unknown): err is WaxChainApiError => err instanceof WaxChainApiError;

  let description = 'Operation failed';

  if (!defaultDescription) {
    let errorDescription;
    if (isWaxError(e)) {
      const error = e as any;
      // this is temporary solution for "wait 5 minut after create another post" error
      if (error?.apiError?.code === -32003) {
        errorDescription = error?.apiError?.data?.stack[0]?.format;
      } else {
        errorDescription = error?.message ?? errorDescription;
      }
    } else if (isError(e)) {
      errorDescription = e.message;
    } else if (typeof e === 'string') {
      errorDescription = e;
    }

    let wellKnownErrorDescription;
    for (const wked of wellKnownErrorDescriptions) {
      if (errorDescription.includes(wked)) {
        wellKnownErrorDescription = wked;
        break;
      }
    }

    if (wellKnownErrorDescription) {
      description = wellKnownErrorDescription;
    }
  }

  return defaultDescription ?? description;
}
