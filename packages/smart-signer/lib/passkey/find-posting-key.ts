import { getAccount } from '@transaction/lib/hive-api';
import type { PasskeyBinding } from '@smart-signer/lib/passkey/passkey-binding';
import { matchPostingKey, type KeyAuthority } from '@smart-signer/lib/passkey/posting-key-match';
import { SIGNER_ROLES, SignerError, signerErrorKey, type SignerPopup } from '@smart-signer/lib/passkey/signer-client';

/**
 * A passkey sign-in that cannot go on: `account_not_found`, `key_not_on_account` (the signer's
 * posting key does not sign for the account), `unavailable` (the account could not be read).
 */
export class PasskeyLoginError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'PasskeyLoginError';
    this.code = code;
  }
}

async function postingAuthorityOf(username: string): Promise<KeyAuthority> {
  let account: Awaited<ReturnType<typeof getAccount>> | undefined;
  try {
    account = await getAccount(username);
  } catch (error) {
    throw new PasskeyLoginError('unavailable', error instanceof Error ? error.message : String(error));
  }
  if (!account) throw new PasskeyLoginError('account_not_found', `no Hive account ${username}`);
  return account.posting;
}

/**
 * Asks the signer in `popup` for its posting key (account 0) and reads `username`'s posting
 * authority; resolves with the signer and the key when the key signs for the account on its own.
 */
export async function findPasskeyPostingKey(popup: SignerPopup, username: string): Promise<PasskeyBinding> {
  const [{ keys }, authority] = await Promise.all([
    popup.call('getPublicKeys', { roles: [SIGNER_ROLES.posting], account: 0 }),
    postingAuthorityOf(username)
  ]);
  const derived = keys.filter((key) => key.role === SIGNER_ROLES.posting).map((key) => key.publicKey);
  if (derived.length === 0) throw new SignerError('internal', 'the signer returned no posting key');
  const publicKey = matchPostingKey(authority, derived);
  if (!publicKey) {
    throw new PasskeyLoginError('key_not_on_account', `the signer's posting key does not sign for ${username}`);
  }
  return { origin: popup.origin, publicKey };
}

/**
 * The `login_form.passkey.*` key explaining a failed passkey sign-in step: a signer failure's
 * `signer_errors.*`, a `PasskeyLoginError`'s `errors.*`; null for a cancelled signer popup (nothing
 * to say), undefined for any other error (the caller's generic handling).
 */
export function passkeyLoginErrorKey(error: unknown): string | null | undefined {
  if (error instanceof PasskeyLoginError) return `login_form.passkey.errors.${error.code}`;
  if (!(error instanceof SignerError)) return undefined;
  const key = signerErrorKey(error);
  return key === null ? null : `login_form.passkey.signer_errors.${key}`;
}
