import { LiteAuthorityError } from './lite-authority-query.ts';
import { signerErrorKey, SignerError } from './signer-client.ts';

/** The gateway's `POST /l2` codes, by the `lite_account.authority_errors.*` key that explains them. */
const RELAY_ERROR_KEYS: Record<string, string> = {
  rate_limited: 'rate_limited',
  auth_failed: 'auth_failed',
  wrong_signer: 'auth_failed',
  app_not_relayed: 'not_relayed',
  method_not_relayed: 'not_relayed',
  not_found: 'not_found'
};

const hasCode = (error: unknown): error is Error & { code: string } =>
  error instanceof Error && 'code' in error && typeof error.code === 'string';

/**
 * The translation key of what a failed passkey flow tells the user: a signer failure's
 * `lite_account.signer_errors.*` key, an authority step's or the gateway's
 * `lite_account.authority_errors.*` key; null for a cancelled signer popup, which says nothing.
 */
export function liteAuthorityErrorKey(error: unknown): string | null {
  if (error instanceof SignerError) {
    const key = signerErrorKey(error);
    return key === null ? null : `lite_account.signer_errors.${key}`;
  }
  if (error instanceof LiteAuthorityError) return `lite_account.authority_errors.${error.code}`;
  const key = hasCode(error) ? RELAY_ERROR_KEYS[error.code] : undefined;
  return `lite_account.authority_errors.${key ?? 'unavailable'}`;
}
