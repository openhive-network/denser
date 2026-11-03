import type { KeyRefusal, KeyRole } from './key-role';

type SignInKeyRole = Exclude<KeyRole, 'owner'>;

/** Smart-signer translation keys of the hint shown for a key that cannot sign as the key type asked for */
export const KEY_ROLE_HINTS: Record<SignInKeyRole, string> = {
  active: 'login_form.zod_error.key_without_active_authority',
  posting: 'login_form.zod_error.active_key_for_posting'
};

/** A smart-signer translation key, with the values it interpolates besides the Direct Authority Mode label (`mode`) */
export interface KeyHint {
  key: string;
  values?: Record<string, string>;
}

const AUTHORISED_ACCOUNT_KEY_HINTS: Record<SignInKeyRole, string> = {
  active: 'login_form.zod_error.authorised_account_active_key',
  posting: 'login_form.zod_error.authorised_account_posting_key'
};

const OTHER_ACCOUNT_KEY_HINTS: Record<SignInKeyRole, string> = {
  active: 'login_form.zod_error.other_account_active_key',
  posting: 'login_form.zod_error.other_account_posting_key'
};

/**
 * The hint for a key `classifyKeyRefusal` refused as `account`'s `keyType` key, or null for a key
 * that safe storage takes as it is: an authorised account's key with Direct Authority Mode off
 * (`strict` false), which it accepts through the account's `account_auths`.
 */
export function findKeyRefusalHint(
  refusal: KeyRefusal,
  account: string,
  keyType: SignInKeyRole,
  strict: boolean
): KeyHint | null {
  switch (refusal.kind) {
    case 'own-other-role':
      return { key: KEY_ROLE_HINTS[keyType] };
    case 'authorised-account':
      return strict
        ? { key: AUTHORISED_ACCOUNT_KEY_HINTS[keyType], values: { owner: refusal.owner, account } }
        : null;
    case 'unrelated-account':
      return { key: OTHER_ACCOUNT_KEY_HINTS[keyType], values: { owner: refusal.owner, account } };
  }
}

// hived's answer to `verify_authority` for a signature the named authority does not accept
const MISSING_AUTHORITY_PATTERN = /missing (posting|active) authority/i;
// hb-auth's `register` swallows that answer, rejecting with this whenever it finds the key without the authority
const INVALID_CREDENTIALS_PATTERN = /invalid credentials/i;

function messageOf(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return '';
}

/**
 * The role hint for a failed safe-storage registration of a `keyType` key, or null when the failure
 * is not about the key's authority over the account (wrong password, malformed WIF, ...).
 *
 * The authority answer is hb-auth's, so a key the account grants its authority to through
 * `account_auths`, which hb-auth accepts with Direct Authority Mode off, never gets here. Hived's
 * `Missing Posting Authority …` / `Missing Active Authority …` gives the hint of the role it names;
 * hb-auth's `Invalid credentials`, which only says the key lacks the authority it was registered
 * for, gives `keyType`'s. Only meaningful for an error of `register`: `authenticate` answers
 * `Invalid credentials` for a key already stored, too.
 */
export function findRegistrationKeyRoleHint(error: unknown, keyType: SignInKeyRole): string | null {
  const message = messageOf(error);
  const missingRole = MISSING_AUTHORITY_PATTERN.exec(message)?.[1]?.toLowerCase();
  if (missingRole === 'posting' || missingRole === 'active') return KEY_ROLE_HINTS[missingRole];
  return INVALID_CREDENTIALS_PATTERN.test(message) ? KEY_ROLE_HINTS[keyType] : null;
}
