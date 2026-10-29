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

/**
 * Wax's Keychain provider prefixes the extension's own answer with this; the
 * answer is written for the user ("User ignored this transaction"), so it is shown as is.
 * Wax interpolates the answer unchecked, so a missing one arrives as "undefined".
 */
const KEYCHAIN_ERROR_PATTERN = /Keychain error:(.*)/;
const MISSING_KEYCHAIN_MESSAGES = ['', 'undefined', 'null'];

/**
 * Keychain's code for a request the user rejected: their own choice, nothing to report. The message
 * beside it is translated to the extension's language, so only the code identifies it. Wax keeps
 * Keychain's response as the `cause` of the error it throws.
 */
const KEYCHAIN_USER_CANCEL_CODE = 'user_cancel';
const MAX_CAUSE_DEPTH = 5;

function isKeychainUserCancel(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && typeof current === 'object' && current !== null; depth++) {
    if ('error' in current && current.error === KEYCHAIN_USER_CANCEL_CODE) return true;
    current = 'cause' in current ? current.cause : undefined;
  }
  return false;
}

/**
 * Peak Vault rejects a request with its own response, a plain object (`{ success: false, error, message }`)
 * rather than an Error. Its `message` is written for the user, like Keychain's answer.
 */
function findWalletResponseMessage(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || error instanceof Error) return undefined;
  if (!('success' in error) || error.success !== false) return undefined;
  const message = 'message' in error && typeof error.message === 'string' ? error.message.trim() : '';
  return message || undefined;
}

/**
 * The error's message without the rest of it: a wallet's response or wax's error can carry the
 * transaction the user signed, which the always-on error log must not print.
 */
export function summarizeErrorForLog(error: unknown): string {
  if (error instanceof Error) return scrubSensitiveData(`${error.name}: ${error.message}`);
  if (typeof error === 'string') return scrubSensitiveData(error);
  return findWalletResponseMessage(error) ?? 'non-Error value';
}

function stringifyError(error: unknown): string {
  try {
    return JSON.stringify(error) ?? String(error);
  } catch {
    return String(error);
  }
}

// TODO: Refactor this function to use the new error handling mechanism
// This is not working as expected and it isn't configurable to show UI errors
/**
 * Return error description by trying to find a message for user in error stuff,
 * then swallow error
 *
 * @param {*} e
 * @param {{ method: string, params: T }} ctx
 * @returns error description; `isWellKnownError` marks one not worth reporting,
 * `isKeychainMessageMissing` a Keychain error that came without the extension's answer
 */
export function transformError<T>(e: any, ctx?: { method: string; params: T }, defaultDescription?: string) {
  let description = 'Error';
  let isWellKnownError = false;
  let isKeychainMessageMissing = false;
  const isUserCancel = isKeychainUserCancel(e);
  const walletResponseMessage = findWalletResponseMessage(e);

  logger.error(
    'in transformError: got error (will be swallowed) on method %s: %s',
    ctx?.method,
    summarizeErrorForLog(e)
  );
  logger.debug('in transformError: full error: %o', e);

  if (e instanceof Error) {
    e = `${e.name}: ${e.message}`;
  } else if (typeof e !== 'string') {
    e = stringifyError(e);
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

    const keychainMessage = KEYCHAIN_ERROR_PATTERN.exec(e)?.[1]?.trim();

    if (wellKnownErrorDescription) {
      description = wellKnownErrorDescription;
      isWellKnownError = true;
    } else if (walletResponseMessage) {
      description = walletResponseMessage;
    } else if (keychainMessage === undefined) {
      description = errorDescription;
    } else if (MISSING_KEYCHAIN_MESSAGES.includes(keychainMessage)) {
      description = errorDescription;
      isKeychainMessageMissing = true;
    } else {
      description = keychainMessage;
    }
  }
  isWellKnownError ||= isUserCancel;

  return {
    errorTitle: defaultDescription ?? description,
    fullError: scrubSensitiveData(e.toString()),
    isWellKnownError,
    isKeychainMessageMissing
  };
}
