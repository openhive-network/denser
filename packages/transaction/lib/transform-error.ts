import { getLogger } from '@hive/ui/lib/logging';
import { scrubSensitiveData } from '@hive/ui/lib/sentry-scrub';
import { isJSON } from '@ui/lib/utils';

const logger = getLogger('app');

/**
 * Strings to look for in error's stuff. When found, we can assume
 * that we caught well known error and we can use these strings in
 * message for user safely.
 */
const wellKnownErrorDescriptions = [
  // Voting errors
  'Your current vote on this comment is identical to this vote',
  'Account does not have enough mana to downvote',
  'Vote weight cannot be 0',

  // Posting rate limits
  'You may only post once every 5 minutes',
  'You may only comment once every 3 seconds',

  // Authentication/hb-auth errors
  'Invalid credentials',
  'Invalid password',
  'Not authorized',
  'Authentication failed',
  'Invalid WIF',
  'Invalid WIF key',
  'Invalid WIF checksum',
  'Invalid WIF format',
  'User not found',
  'Key verification failed',
  'Wallet is locked',
  'Failed to unlock wallet',
  'No password provided',
  'No key provided',
  'Operation cancelled',
  'Wallet operation failed',
  'Operation failed',
  'Login failed - invalid challenge',
  'Key already registered - update it instead',

  // Key registration errors
  'Registration failed',
  'Failed to import key',
  'Key is not registered',

  // Blockchain/authority errors
  'Account not found on the blockchain',
  'authority for this account',

  // Auth storage desync (IndexedDB cleared while session valid)
  'Auth for user',

  // User-cancelled operations (password dialog dismissed)
  'No password from user'
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
  logger.error('in transformError: got error (will be swallowed): %o on method: %s', e, ctx?.method);

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
    fullError: scrubSensitiveData(e.toString()),
    isWellKnownError
  };
}
