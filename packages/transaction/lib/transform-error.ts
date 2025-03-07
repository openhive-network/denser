import { getLogger } from '@hive/ui/lib/logging';
import { isJSON } from '@ui/lib/utils';

const logger = getLogger('app');

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
  'You may only comment once every 3 seconds',
  'Invalid credentials'
];

// TODO: Refactor this function to use the new error handling mechanism
// This is not working as expected and it isn't configurable to show UI errors
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

  let description = 'Error';
  let isWellKnownError = false;

  if (e instanceof Error) {
    e = `${e.name}: ${e.message}`;
  } else if (isJSON(e)) {
    e = JSON.stringify(e);
  }

  if (!defaultDescription) {
    let errorDescription = 'Error';

    let wellKnownErrorDescription;
    for (const wked of wellKnownErrorDescriptions) {
      if (e.includes(wked)) {
        wellKnownErrorDescription = wked;
        break;
      }
    }

    if (wellKnownErrorDescription) {
      description = wellKnownErrorDescription;
      isWellKnownError = true;
    } else {
      description = errorDescription;
    }
  }

  return {
    errorTitle: defaultDescription ?? description,
    fullError: e.toString(),
    isWellKnownError
  };
}
