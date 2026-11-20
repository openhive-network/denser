import { getLogger } from '@hive/ui/lib/logging';
import { scrubSensitiveData } from '@hive/ui/lib/sentry-scrub';
import { isJSON } from '@ui/lib/utils';
import { describeError } from './describe-error';

const logger = getLogger('app');

/**
 * Strings to look for in error's stuff. When found, we can assume that we caught well known error,
 * whose message for the user is the text of `key` (a smart-signer translation key): the toast
 * translates it, `transformError` keeps the English `description` for the log and as the fallback.
 * Order matters: the first entry found wins, so more specific strings come first.
 */
const wellKnownErrorDescriptions: { description: string; key: string }[] = [
  // Voting errors
  {
    description: 'Your current vote on this comment is identical to this vote',
    key: 'broadcast_error.vote_identical'
  },
  { description: 'Account does not have enough mana to downvote', key: 'broadcast_error.not_enough_downvote_mana' },
  { description: 'Vote weight cannot be 0', key: 'broadcast_error.vote_weight_zero' },

  // Posting rate limits
  { description: 'You may only post once every 5 minutes', key: 'broadcast_error.post_interval' },
  { description: 'You may only comment once every 3 seconds', key: 'broadcast_error.comment_interval' },

  // Authentication/hb-auth errors
  { description: 'Invalid credentials', key: 'auth_error.authentication_failed' },
  { description: 'Invalid password', key: 'auth_error.invalid_password' },
  { description: 'Not authorized', key: 'auth_error.authentication_failed' },
  { description: 'Authentication failed', key: 'auth_error.authentication_failed' },
  { description: 'Invalid WIF checksum', key: 'chainvalidation_js.invalid_wif_checksum' },
  { description: 'Invalid WIF format', key: 'chainvalidation_js.invalid_wif_format' },
  { description: 'Invalid WIF', key: 'login_form.zod_error.invalid_wif' },
  { description: 'User not found', key: 'auth_error.user_not_found' },
  { description: 'Key verification failed', key: 'auth_error.key_verification_failed' },
  { description: 'Wallet is locked', key: 'auth_error.wallet_locked' },
  { description: 'Failed to unlock wallet', key: 'auth_error.unlock_failed' },
  { description: 'No password provided', key: 'login_form.zod_error.password_required' },
  { description: 'No key provided', key: 'auth_error.no_key_provided' },
  { description: 'Operation cancelled', key: 'auth_error.operation_cancelled' },
  { description: 'Wallet operation failed', key: 'auth_error.wallet_operation_failed' },
  { description: 'Operation failed', key: 'auth_error.operation_failed' },
  { description: 'Login failed - invalid challenge', key: 'auth_error.invalid_challenge' },
  { description: 'Key already registered - update it instead', key: 'auth_error.already_registered' },

  // Key registration errors
  { description: 'Registration failed', key: 'auth_error.key_not_added' },
  { description: 'Failed to import key', key: 'auth_error.key_not_added' },
  { description: 'Key is not registered', key: 'auth_error.key_not_registered' },

  // Blockchain/authority errors
  { description: 'Account not found on the blockchain', key: 'auth_error.account_not_found' },
  { description: 'authority for this account', key: 'auth_error.missing_authority' },

  // Auth storage desync (IndexedDB cleared while session valid)
  { description: 'Auth for user', key: 'broadcast_error.safe_storage_missing_account' },

  // User-cancelled operations (password dialog dismissed)
  { description: 'No password from user', key: 'auth_error.operation_cancelled' }
];

/** The smart-signer translation key of the generic title, for an error the app has no text of its own for */
export const GENERIC_ERROR_TITLE_KEY = 'broadcast_error.generic_title';

/**
 * Wax's Keychain provider prefixes the extension's own answer with this; the
 * answer is written for the user ("User ignored this transaction"), so it is shown as is.
 * Wax interpolates the answer unchecked, so a missing one arrives as "undefined".
 */
const KEYCHAIN_ERROR_PATTERN = /Keychain error:(.*)/;
const MISSING_KEYCHAIN_MESSAGES = ['', 'undefined', 'null'];
/**
 * Keychain's generic English answer for a transaction it failed to sign, misspelled ("occured"); it says
 * nothing the app's own, translated text cannot, so that is shown instead.
 */
const KEYCHAIN_SIGNING_FAILURE_PATTERN = /^An error occur+ed while signing the transaction\.?$/i;

/** A Keychain error the toast titles with the app's own text: one without an answer, or a generic signing failure */
export type KeychainFallback = 'no_message' | 'signing_failed';

function keychainFallbackFor(keychainMessage: string): KeychainFallback | null {
  if (MISSING_KEYCHAIN_MESSAGES.includes(keychainMessage)) return 'no_message';
  if (KEYCHAIN_SIGNING_FAILURE_PATTERN.test(keychainMessage)) return 'signing_failed';
  return null;
}

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
 * A broadcast the chain rejected for asking more than the account holds, which the toast titles with the
 * app's own text: wax's message interpolates the node's assets as "[object Object]". A claim is rejected
 * when its rewards were already claimed (another tab, a stale page) or are smaller than shown.
 */
export type InsufficientBalance = 'rewards_already_claimed' | 'balance_too_low';

const INSUFFICIENT_BALANCE_ERROR_NAME = 'WaxInsufficientBalanceError';
const CLAIM_REWARD_METHOD = 'claim_reward_balance';
// hived's claim_reward_balance evaluator ("Cannot claim that much HIVE/HBD/VESTS")
const CLAIM_TOO_MUCH_PATTERN = /Cannot claim that much/i;
/**
 * hived's adjust_balance (transfer, power up, transfer to savings, ...) asserts without the chain's balance
 * tag, so wax raises it as a plain WaxAssertionError rather than WaxInsufficientBalanceError
 */
const NOT_SUFFICIENT_FUNDS_PATTERN = /does not have sufficient funds/i;

function findInsufficientBalance(error: unknown, method: string | undefined): InsufficientBalance | null {
  const description = describeError(error);
  const isClaimTooMuch = CLAIM_TOO_MUCH_PATTERN.test(description);
  const isInsufficientBalance =
    isClaimTooMuch ||
    NOT_SUFFICIENT_FUNDS_PATTERN.test(description) ||
    (error instanceof Error && error.name === INSUFFICIENT_BALANCE_ERROR_NAME);
  if (!isInsufficientBalance) return null;
  return isClaimTooMuch || method === CLAIM_REWARD_METHOD ? 'rewards_already_claimed' : 'balance_too_low';
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
 * @returns error description, in English; `errorTitleKey` is the smart-signer translation key to
 * title the toast with instead (none for a wallet's own message), `isWellKnownError` marks one not
 * worth reporting, `keychainFallback` a Keychain error and `insufficientBalance` a chain rejection to
 * title with the app's own text rather than the description
 */
export function transformError<T>(e: any, ctx?: { method: string; params: T }, defaultDescription?: string) {
  let description = 'Error';
  let errorTitleKey: string | undefined;
  let isWellKnownError = false;
  let keychainFallback: KeychainFallback | null = null;
  const isUserCancel = isKeychainUserCancel(e);
  const walletResponseMessage = findWalletResponseMessage(e);
  const insufficientBalance = findInsufficientBalance(e, ctx?.method);

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

    const wellKnownError = wellKnownErrorDescriptions.find(({ description }) => e.includes(description));

    const keychainMessage = KEYCHAIN_ERROR_PATTERN.exec(e)?.[1]?.trim();

    if (wellKnownError) {
      description = wellKnownError.description;
      errorTitleKey = wellKnownError.key;
      isWellKnownError = true;
    } else if (walletResponseMessage) {
      description = walletResponseMessage;
    } else if (keychainMessage === undefined) {
      description = errorDescription;
      errorTitleKey = GENERIC_ERROR_TITLE_KEY;
    } else {
      keychainFallback = keychainFallbackFor(keychainMessage);
      description = keychainFallback === 'no_message' ? errorDescription : keychainMessage;
    }
  }
  isWellKnownError ||= isUserCancel || insufficientBalance !== null;

  return {
    errorTitle: defaultDescription ?? description,
    errorTitleKey,
    fullError: scrubSensitiveData(e.toString()),
    isWellKnownError,
    keychainFallback,
    insufficientBalance
  };
}
