/**
 * Why a passkey did not give the safe storage password: the user cancelled or let the browser's
 * prompt time out, or the app aborted it (WebAuthn's NotAllowedError, AbortError; the browser
 * answers so too where the account has no passkey it reaches, so this never says the passkey is
 * gone), the authenticator has no PRF, the user has no passkey registered, the registered one no
 * longer unlocks (its password does not decrypt, or safe storage refuses it), the user picked
 * another account's passkey, another passkey of the account took the registered one's place and
 * needs the password once (`replaced`), or the ceremony failed otherwise.
 */
export type PasskeyUnlockFailure =
  | 'cancelled'
  | 'unsupported'
  | 'not-registered'
  | 'stale'
  | 'wrong-account'
  | 'replaced'
  | 'failed';

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

/** A smart-signer translation key, and whether it names an error rather than a neutral fact */
export type PasskeyEnableMessage = { key: string; error: boolean };

/**
 * What to tell the user about enabling the passkey unlock failing with `error`. A cancelled prompt
 * is no error: the user dismissed it, or left a provider's own setup unfinished (a screen lock or
 * recovery PIN to set first), which the browser rejects alike, so a neutral line says it can be
 * tried again.
 */
export function passkeyEnableMessage(error: unknown): PasskeyEnableMessage {
  if (!(error instanceof PasskeyUnlockError)) return { key: 'login_form.passkey_prompt.failed', error: true };
  if (error.reason === 'cancelled')
    return { key: 'login_form.passkey_prompt.create_cancelled', error: false };
  if (error.reason === 'unsupported') return { key: 'login_form.passkey_prompt.unsupported', error: true };
  return { key: 'login_form.passkey_prompt.failed', error: true };
}
