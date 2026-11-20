/**
 * Why a passkey did not give the safe storage password: the user cancelled or let the browser's
 * prompt time out (WebAuthn's NotAllowedError, AbortError), the authenticator has no PRF, the user
 * has no passkey registered, the registered one no longer unlocks (its password does not decrypt,
 * or safe storage refuses it), or the ceremony failed otherwise.
 */
export type PasskeyUnlockFailure = 'cancelled' | 'unsupported' | 'not-registered' | 'stale' | 'failed';

export class PasskeyUnlockError extends Error {
  readonly reason: PasskeyUnlockFailure;

  constructor(message: string, reason: PasskeyUnlockFailure, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PasskeyUnlockError';
    this.reason = reason;
  }
}

const CANCELLED_CEREMONY_ERRORS = new Set(['NotAllowedError', 'AbortError']);

/** A rejection of `navigator.credentials` as a PasskeyUnlockError of `step` (the message, for the log) */
export function ceremonyError(step: string, error: unknown): PasskeyUnlockError {
  const name = error instanceof Error ? error.name : '';
  const detail = error instanceof Error ? error.message : String(error);
  const reason = CANCELLED_CEREMONY_ERRORS.has(name) ? 'cancelled' : 'failed';
  return new PasskeyUnlockError(`${step}: ${name || 'Error'}: ${detail}`, reason, { cause: error });
}

/**
 * The smart-signer translation key telling the user that enabling the passkey unlock failed with
 * `error`; null for a prompt the user cancelled, which needs no message
 */
export function passkeyEnableFailureKey(error: unknown): string | null {
  if (!(error instanceof PasskeyUnlockError)) return 'login_form.passkey_prompt.failed';
  if (error.reason === 'cancelled') return null;
  if (error.reason === 'unsupported') return 'login_form.passkey_prompt.unsupported';
  return 'login_form.passkey_prompt.failed';
}
