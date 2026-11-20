import { getLogger } from '@ui/lib/logging';
import { findInCauses } from '@smart-signer/lib/wrong-safe-storage-password';

const logger = getLogger('app');

/**
 * Error thrown when the user's session exists but their IndexedDB key storage
 * has been cleared by the browser (storage eviction, cleared data, corruption).
 * This creates a desync between the server session and client key storage.
 */
export class AuthStorageMissingError extends Error {
  readonly username: string;
  readonly keyType: string;

  constructor(username: string, keyType: string) {
    super(`Auth for user ${username} not found. Hint: add ${keyType} key to safe storage.`);
    this.name = 'AuthStorageMissingError';
    this.username = username;
    this.keyType = keyType;
  }
}

/**
 * A signing step refused by safe storage (hb-auth) or by the key's authority check. Its message stays
 * English, for the log and the patterns matched on it; `messageKey`, the smart-signer translation key
 * of a well-known failure, is what the error toast shows.
 */
export class AuthFailureError extends Error {
  readonly messageKey?: string;

  constructor(message: string, messageKey?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AuthFailureError';
    this.messageKey = messageKey;
  }
}

/** The smart-signer translation key of the AuthFailureError `error` is or was caused by, if it has one */
export function findAuthFailureKey(error: unknown): string | undefined {
  const found = findInCauses(error, (candidate) => candidate instanceof AuthFailureError);
  return found instanceof AuthFailureError ? found.messageKey : undefined;
}

/**
 * Check if an error represents an auth storage desync
 * (session exists but IndexedDB keys are gone).
 */
export function isAuthStorageMissing(error: unknown): boolean {
  if (error instanceof AuthStorageMissingError) return true;
  const message = extractErrorMessage(error);
  return /Auth for user .+ not found/i.test(message);
}

/**
 * Well-known hb-auth error messages that can be shown to users safely
 * These are specific error conditions from hb-auth that have clear meanings
 */
export const AUTH_ERROR_MESSAGES = {
  // Authentication errors
  NOT_AUTHORIZED: 'Not authorized',
  AUTHENTICATION_FAILED: 'Authentication failed',
  INVALID_CREDENTIALS: 'Invalid credentials',
  USER_ALREADY_LOGGED_IN: 'User is already logged in',
  USER_NOT_FOUND: 'User not found',

  // WIF/Key errors
  INVALID_WIF: 'Invalid WIF',
  INVALID_WIF_KEY: 'Invalid WIF key',
  INVALID_WIF_CHECKSUM: 'Invalid WIF checksum',
  INVALID_WIF_FORMAT: 'Invalid WIF format',
  KEY_NOT_REGISTERED: 'Key is not registered',
  KEY_VERIFICATION_FAILED: 'Key verification failed',

  // Wallet errors
  WALLET_LOCKED: 'Wallet is locked',
  UNLOCK_FAILED: 'Failed to unlock wallet',

  // Registration errors
  REGISTRATION_FAILED: 'Registration failed',
  KEY_IMPORT_FAILED: 'Failed to import key',

  // Generic
  OPERATION_CANCELLED: 'Operation cancelled',
  NO_PASSWORD_PROVIDED: 'No password provided',
  NO_KEY_PROVIDED: 'No key provided'
} as const;

/**
 * Patterns to match in error messages for categorization, each with the English message (for logs
 * and errors thrown on) and the smart-signer translation key shown to the user.
 * Order matters - more specific patterns should come first
 */
const ERROR_PATTERNS: { pattern: RegExp; message: string; key: string }[] = [
  { pattern: /invalid wif checksum/i, message: AUTH_ERROR_MESSAGES.INVALID_WIF_CHECKSUM, key: 'chainvalidation_js.invalid_wif_checksum' },
  { pattern: /invalid wif format/i, message: AUTH_ERROR_MESSAGES.INVALID_WIF_FORMAT, key: 'chainvalidation_js.invalid_wif_format' },
  { pattern: /invalid wif/i, message: AUTH_ERROR_MESSAGES.INVALID_WIF_KEY, key: 'login_form.zod_error.invalid_wif' },
  { pattern: /invalid password/i, message: 'Invalid password', key: 'auth_error.invalid_password' },
  { pattern: /not authorized/i, message: AUTH_ERROR_MESSAGES.NOT_AUTHORIZED, key: 'auth_error.authentication_failed' },
  { pattern: /authentication failed/i, message: AUTH_ERROR_MESSAGES.AUTHENTICATION_FAILED, key: 'auth_error.authentication_failed' },
  { pattern: /invalid credentials/i, message: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS, key: 'auth_error.authentication_failed' },
  { pattern: /user is already logged in/i, message: AUTH_ERROR_MESSAGES.USER_ALREADY_LOGGED_IN, key: 'auth_error.user_already_logged_in' },
  { pattern: /user not found/i, message: AUTH_ERROR_MESSAGES.USER_NOT_FOUND, key: 'auth_error.user_not_found' },
  { pattern: /wallet.*locked/i, message: AUTH_ERROR_MESSAGES.WALLET_LOCKED, key: 'auth_error.wallet_locked' },
  { pattern: /unlock.*fail/i, message: AUTH_ERROR_MESSAGES.UNLOCK_FAILED, key: 'auth_error.unlock_failed' },
  { pattern: /fail.*unlock/i, message: AUTH_ERROR_MESSAGES.UNLOCK_FAILED, key: 'auth_error.unlock_failed' },
  { pattern: /registration.*fail/i, message: AUTH_ERROR_MESSAGES.REGISTRATION_FAILED, key: 'auth_error.key_not_added' },
  { pattern: /fail.*registration/i, message: AUTH_ERROR_MESSAGES.REGISTRATION_FAILED, key: 'auth_error.key_not_added' },
  { pattern: /key.*not.*registered/i, message: AUTH_ERROR_MESSAGES.KEY_NOT_REGISTERED, key: 'auth_error.key_not_registered' },
  { pattern: /import.*fail/i, message: AUTH_ERROR_MESSAGES.KEY_IMPORT_FAILED, key: 'auth_error.key_not_added' },
  { pattern: /fail.*import/i, message: AUTH_ERROR_MESSAGES.KEY_IMPORT_FAILED, key: 'auth_error.key_not_added' },
  { pattern: /cancelled|canceled/i, message: AUTH_ERROR_MESSAGES.OPERATION_CANCELLED, key: 'auth_error.operation_cancelled' },
  { pattern: /already registered/i, message: 'Key already registered - update it instead', key: 'auth_error.already_registered' },
  { pattern: /beekeeper.*error/i, message: 'Wallet operation failed', key: 'auth_error.wallet_operation_failed' },
  { pattern: /assert_exception/i, message: 'Operation failed', key: 'auth_error.operation_failed' },
  { pattern: /missing.*challenge/i, message: 'Login failed - invalid challenge', key: 'auth_error.invalid_challenge' },
  { pattern: /account not found on the blockchain/i, message: 'Account not found on the blockchain', key: 'auth_error.account_not_found' },
  { pattern: /missing (posting|active|owner) authority/i, message: 'Key does not have the required authority for this account', key: 'auth_error.missing_authority' },
  { pattern: /does not have.*authority/i, message: 'Key does not have the required authority for this account', key: 'auth_error.missing_authority' }
];

/** The smart-signer key of the message shown when an error is neither known nor readable. */
const UNKNOWN_AUTH_ERROR_KEY = 'auth_error.unknown';

export interface AuthErrorResult {
  /** User-friendly error message, in English */
  message: string;
  /** The smart-signer translation key of `message`, for a well-known error */
  messageKey?: string;
  /** Original error for logging/debugging */
  originalError: unknown;
  /** Whether this is a well-known/expected error */
  isKnownError: boolean;
}

/**
 * Extract a clean error message from various error types
 * Handles AuthorizationError, Error, string, and unknown types
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    // Handle AuthorizationError or similar objects with message property
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    // Try to stringify the object
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

/**
 * Find a matching well-known error pattern
 */
function findMatchingPattern(message: string): { message: string; key: string } | null {
  for (const { pattern, message: knownMessage, key } of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return { message: knownMessage, key };
    }
  }
  return null;
}

/**
 * Parse and normalize authentication errors from hb-auth and related systems.
 * This function extracts meaningful error messages and categorizes them.
 *
 * @param error - The error to parse (can be AuthorizationError, Error, string, or unknown)
 * @param fallbackMessage - Optional fallback message if error cannot be parsed
 * @returns AuthErrorResult with normalized error information
 *
 * @example
 * ```ts
 * try {
 *   await authClient.authenticate(username, password, keyType);
 * } catch (error) {
 *   const { message, isKnownError } = parseAuthError(error);
 *   setError(message);
 *   if (!isKnownError) {
 *     logger.error('Unexpected auth error', error);
 *   }
 * }
 * ```
 */
export function parseAuthError(error: unknown, fallbackMessage?: string): AuthErrorResult {
  const rawMessage = extractErrorMessage(error);
  const matched = findMatchingPattern(rawMessage);

  if (matched) {
    return {
      message: matched.message,
      messageKey: matched.key,
      originalError: error,
      isKnownError: true,
    };
  }

  // If we have a meaningful message from the error itself, use it
  // This handles cases where hb-auth provides specific error messages
  if (rawMessage && rawMessage !== '[object Object]' && rawMessage !== 'undefined' && rawMessage !== 'null') {
    // Check if the message looks like a technical error (stack trace)
    // We want to show actual error messages from hb-auth, but hide stack traces
    const looksLikeStackTrace =
      /^\s+at\s+/.test(rawMessage) || // Starts with stack trace line
      /node_modules/.test(rawMessage) || // Contains file paths from node_modules
      (/\n\s+at\s+/.test(rawMessage) && rawMessage.split('\n').filter((l) => /^\s+at\s+/.test(l)).length > 2); // Multiple stack trace lines

    // Clean up error messages that have the error type prefix (e.g., "AuthorizationError: message")
    let cleanMessage = rawMessage;
    const errorTypeMatch = rawMessage.match(/^(\w+Error):\s*(.+)$/);
    if (errorTypeMatch) {
      cleanMessage = errorTypeMatch[2]; // Extract just the message part
    }

    if (!looksLikeStackTrace && cleanMessage.length > 0) {
      return {
        message: cleanMessage,
        originalError: error,
        isKnownError: false
      };
    }
  }

  // Fall back to provided message or generic error
  return {
    message: fallbackMessage || 'An authentication error occurred',
    ...(fallbackMessage ? {} : { messageKey: UNKNOWN_AUTH_ERROR_KEY }),
    originalError: error,
    isKnownError: false
  };
}

/**
 * `error`, hb-auth's failure, as an AuthFailureError caused by it, with parseAuthError's message and
 * the translation key of a well-known failure; an unknown one keeps hb-auth's own message and no key.
 */
export function toAuthFailure(error: unknown): AuthFailureError {
  const { message, messageKey } = parseAuthError(error);
  return new AuthFailureError(message, messageKey, { cause: error });
}

/**
 * Handle an authentication error with logging.
 * Logs the error and returns a user-friendly message.
 *
 * @param error - The error to handle
 * @param context - Context string for logging (e.g., 'onUpdateKey', 'onAuthenticate')
 * @param translate - Gives the text of a smart-signer translation key in the page's language
 * @returns User-friendly error message string: translated for a well-known error, else the
 *   error's own (hb-auth's) message
 *
 * @example
 * ```ts
 * catch (error) {
 *   const message = handleAuthError(error, 'onUpdateKey', (key) => t(key, { ns: SMART_SIGNER_NAMESPACE }));
 *   setError(message);
 * }
 * ```
 */
export function handleAuthError(error: unknown, context: string, translate: (key: string) => string): string {
  const result = parseAuthError(error);

  // Always log the original error for debugging
  logger.error('Auth error in %s: %s', context, result.originalError instanceof Error ? result.originalError.message : String(result.originalError));

  if (!result.isKnownError) {
    // Log additional details for unknown errors to help with debugging
    logger.warn('Unknown auth error type in %s, message: %s', context, result.message);
  }

  return result.messageKey ? translate(result.messageKey) : result.message;
}

/**
 * Check if an error indicates that re-authentication or key update is needed.
 * Used to determine if we should redirect to key update flow.
 *
 * @param error - The error to check
 * @returns true if the error indicates key update is needed
 */
export function isKeyUpdateNeeded(error: unknown): boolean {
  const message = extractErrorMessage(error);
  return (
    /not authorized/i.test(message) ||
    /authentication failed/i.test(message) ||
    /invalid credentials/i.test(message) ||
    /key verification failed/i.test(message)
  );
}

/**
 * Check if an error indicates the key is already registered in safe storage.
 * This is separate from isKeyUpdateNeeded because "already registered" means
 * the key exists (not that authentication failed).
 */
export function isAlreadyRegistered(error: unknown): boolean {
  const message = extractErrorMessage(error);
  return /already registered/i.test(message);
}

/**
 * Check if an error should be silently ignored.
 * Currently only "User is already logged in" is silently ignored.
 *
 * @param error - The error to check
 * @returns true if the error should be silently ignored
 */
export function isIgnorableError(error: unknown): boolean {
  const message = extractErrorMessage(error);
  return /user is already logged in/i.test(message);
}
