import type { RoleAuthority } from './authority-checks.ts';

export type ChangedRole = 'owner' | 'active' | 'posting';

const CHANGED_ROLES: readonly ChangedRole[] = ['owner', 'active', 'posting'];

/** A key or account of a `database_api.find_accounts` authority, with its weight */
interface ChainAuth {
  0: string;
  1: number;
}

/** An authority as `database_api.find_accounts` returns it */
interface ChainAuthority {
  weight_threshold: number;
  account_auths: readonly ChainAuth[];
  key_auths: readonly ChainAuth[];
}

/** The owner, active and posting authorities of a chain account, as `currentPublicKeys` reads them. */
export function roleAuthoritiesOf(account: Record<ChangedRole, ChainAuthority>): RoleAuthority[] {
  const auths = (entries: readonly ChainAuth[]) =>
    entries.map((entry) => ({ keyOrAccount: entry[0], thresholdWeight: entry[1] }));
  return CHANGED_ROLES.map((level) => ({
    level,
    key_auths: auths(account[level].key_auths),
    account_auths: auths(account[level].account_auths),
    weight_threshold: account[level].weight_threshold
  }));
}

/** The key computations of wax a password change needs */
export interface KeyDerivation {
  /** Throws when `wif` is not a private key */
  publicKeyOf: (wif: string) => string;
  keyFromPassword: (
    username: string,
    role: ChangedRole,
    password: string
  ) => { wifPrivateKey: string; associatedPublicKey: string };
}

export type CredentialErrorCode = 'wrong_password' | 'not_owner_key' | 'role_not_single_key';

/** The current credential does not prove the account's keys; `role` names the role that failed */
export class CredentialError extends Error {
  readonly code: CredentialErrorCode;
  readonly role: ChangedRole;

  constructor(code: CredentialErrorCode, role: ChangedRole) {
    super(`Current credential refused (${code}) for the ${role} role`);
    this.name = 'CredentialError';
    this.code = code;
    this.role = role;
  }
}

/** A current credential is the account's owner private key when it reads as a private key at all. */
export function credentialKind(credential: string, derivation: Pick<KeyDerivation, 'publicKeyOf'>) {
  try {
    derivation.publicKeyOf(credential);
    return 'owner_key';
  } catch {
    return 'master_password';
  }
}

function roleKeys(authorities: readonly RoleAuthority[], role: ChangedRole): string[] {
  return authorities.find(({ level }) => level === role)?.key_auths.map(({ keyOrAccount }) => keyOrAccount) ?? [];
}

/**
 * The public keys of the owner, active and posting roles a password change replaces, proven by
 * `credential`: those `credential` derives as the master password, each held by its role; or, for
 * the owner private key, its public key, held by the owner role, and the only key of the active and
 * posting roles, which the owner key may replace whatever they are.
 *
 * @throws {CredentialError} `wrong_password` when a derived key is not its role's,
 *   `not_owner_key` when the private key is not the owner role's, `role_not_single_key` when the
 *   active or posting role holds other than one key, so which one to replace is unknown
 */
export function currentPublicKeys(
  username: string,
  credential: string,
  authorities: readonly RoleAuthority[],
  derivation: KeyDerivation
): Record<ChangedRole, string> {
  if (credentialKind(credential, derivation) === 'master_password') {
    const derived = (role: ChangedRole) => {
      const key = derivation.keyFromPassword(username, role, credential).associatedPublicKey;
      if (!roleKeys(authorities, role).includes(key)) throw new CredentialError('wrong_password', role);
      return key;
    };
    return { owner: derived('owner'), active: derived('active'), posting: derived('posting') };
  }

  const owner = derivation.publicKeyOf(credential);
  if (!roleKeys(authorities, 'owner').includes(owner)) throw new CredentialError('not_owner_key', 'owner');
  const onlyKey = (role: ChangedRole) => {
    const keys = roleKeys(authorities, role);
    if (keys.length !== 1) throw new CredentialError('role_not_single_key', role);
    return keys[0];
  };
  return { owner, active: onlyKey('active'), posting: onlyKey('posting') };
}

type KeyReplacement = { old: string; new: string };

export interface PasswordChange {
  account: string;
  /** The posting key is left out when it is kept */
  keys: Record<'owner' | 'active', KeyReplacement> & { posting?: KeyReplacement };
  /** The new private keys, of the roles `keys` replaces */
  wifs: Partial<Record<ChangedRole, string>>;
}

/**
 * The key replacements of a change of `username`'s master password to `newPassword`: every role's
 * current key for the one `newPassword` derives, but the posting key's when `keepPosting`.
 */
export function passwordChange(
  username: string,
  current: Record<ChangedRole, string>,
  newPassword: string,
  derivation: KeyDerivation,
  keepPosting: boolean
): PasswordChange {
  const roles = CHANGED_ROLES.filter((role) => !(role === 'posting' && keepPosting));
  const next = Object.fromEntries(roles.map((role) => [role, derivation.keyFromPassword(username, role, newPassword)]));
  const replacement = (role: ChangedRole) => ({ old: current[role], new: next[role].associatedPublicKey });
  return {
    account: username,
    keys: {
      owner: replacement('owner'),
      active: replacement('active'),
      ...(next.posting ? { posting: replacement('posting') } : {})
    },
    wifs: Object.fromEntries(roles.map((role) => [role, next[role].wifPrivateKey]))
  };
}
