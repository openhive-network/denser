import { findInCauses } from '@smart-signer/lib/wrong-safe-storage-password';

// Kept apart from auth-error's pattern table: the error toast, in every page's first chunks, imports this.

/**
 * A signing step refused by safe storage (hb-auth), by the key's authority check or by a signer that
 * cannot sign for the account (no passkey signer known for it). Its message stays
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
