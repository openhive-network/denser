import { getLogger } from '@hive/ui/lib/logging';
import { WaxChainApiError } from '@hiveio/wax';

// TODO: check if still occurs
// Debug why the import
// ```
// import { WaxChainApiError } from '@hiveio/wax';
// ```
// causes following error in e2e playwright tests in Wallet application:
// ```
// Error: No "exports" main defined in /home/syncad/src/denser/node_modules/@hiveio/wax/package.json
// ```

const logger = getLogger('app');

/**
 * Default error description, used when trying to get smarter
 * description fails
 */
const defaultErrorDescription = 'Transaction broadcast error';

/**
 * Strings to look for in error's stuff. When found, we can assume
 * that we caught well known error and we can use these strings in
 * message for user safely.
 */
const wellKnownErrorDescriptions = [
  'Your current vote on this comment is identical to this vote',
  'Account does not have enough mana to downvote',
  'You may only post once every 5 minutes',
  'Vote weight cannot be 0',
  'You may only comment once every 3 seconds'
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
  logger.error('in transformError: got error (will be swallowed): %o on %o', e, ctx);
  const apiMessage = e.apiError?.data.message.charAt(0).toUpperCase() + e.apiError?.data.message.slice(1);
  let description =
    apiMessage && apiMessage.toLowerCase() !== 'assert exception' ? apiMessage : 'Operation failed';

  if (!defaultDescription) {
    let errorDescription = defaultErrorDescription;

    // TODO: check if error at the top of the file still occurs
    if (e instanceof WaxChainApiError) {
      const error = e as any;
      if (error?.apiError?.code === -32003) {
        errorDescription = error?.apiError?.data?.stack[0]?.format;
      } else {
        errorDescription = error?.message ?? errorDescription;
      }
    } else if (e instanceof Error) {
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
