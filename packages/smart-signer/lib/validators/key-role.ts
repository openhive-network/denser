import type { ApiAuthority } from '@hiveio/wax';

export type KeyRole = 'owner' | 'active' | 'posting';

export type AccountAuthorities = Record<KeyRole, ApiAuthority>;

const ROLES_STRONGEST_FIRST: readonly KeyRole[] = ['owner', 'active', 'posting'];

/**
 * Returns the strongest of the account's authorities that lists `publicKey` among its keys, or
 * null when none of them does.
 */
export function findKeyRole(account: AccountAuthorities, publicKey: string): KeyRole | null {
  return findKeyRoles(account, publicKey)[0] ?? null;
}

/**
 * Returns every one of the account's authorities that lists `publicKey` among its keys, strongest
 * first; empty when none of them does.
 */
export function findKeyRoles(account: AccountAuthorities, publicKey: string): KeyRole[] {
  return ROLES_STRONGEST_FIRST.filter((role) =>
    account[role].key_auths.some(({ 0: key }) => key === publicKey)
  );
}

/**
 * Whether `publicKey` is a key of the account that cannot sign as its `keyType` key: a key held by
 * the posting authority alone, offered as the active key, or a key of the active or owner authority
 * but not of the posting one, offered as the posting key (hived refuses it with
 * `tx_missing_posting_auth`). False for a key of none of the account's authorities.
 */
export function isKeyOfOtherRole(
  account: AccountAuthorities,
  publicKey: string,
  keyType: Exclude<KeyRole, 'owner'>
): boolean {
  const roles = findKeyRoles(account, publicKey);
  if (keyType === 'active') return roles[0] === 'posting';
  return roles.length > 0 && !roles.includes('posting');
}

/**
 * True when there is at least one key and every one of them is listed by one of the account's own
 * authorities: none of them belongs to an account the account grants its authority to.
 */
export function areOwnKeys(account: AccountAuthorities, publicKeys: readonly string[]): boolean {
  return publicKeys.length > 0 && publicKeys.every((key) => findKeyRole(account, key) !== null);
}

/** Why a key offered as the account's `keyType` key cannot sign as it, as far as the chain tells */
export type KeyRefusal =
  /** One of the account's own keys, of a role that cannot sign as `keyType` */
  | { kind: 'own-other-role' }
  /** Another account's key, an account the account's `keyType` authority lists in `account_auths` */
  | { kind: 'authorised-account'; owner: string }
  /** Another account's key, an account the account's `keyType` authority does not list */
  | { kind: 'unrelated-account'; owner: string };

/**
 * Classifies `publicKey` offered as `account`'s `keyType` key, given `keyHolders`, the accounts
 * whose authorities list it (`account_by_key_api.get_key_references`). Null when the key may sign
 * as `keyType`, or when it is none of the account's keys and no other account is known to hold it.
 * An authorised holder wins over an unrelated one when several accounts hold the key; whether the
 * holder's key has the role its authority over the account needs is left to the chain.
 */
export function classifyKeyRefusal(
  account: AccountAuthorities & { name: string },
  publicKey: string,
  keyType: Exclude<KeyRole, 'owner'>,
  keyHolders: readonly string[]
): KeyRefusal | null {
  if (findKeyRoles(account, publicKey).length > 0) {
    return isKeyOfOtherRole(account, publicKey, keyType) ? { kind: 'own-other-role' } : null;
  }
  const otherHolders = keyHolders.filter((holder) => holder !== account.name);
  const authorised = otherHolders.find((holder) =>
    account[keyType].account_auths.some(({ 0: name }) => name === holder)
  );
  if (authorised) return { kind: 'authorised-account', owner: authorised };
  const [unrelated] = otherHolders;
  return unrelated ? { kind: 'unrelated-account', owner: unrelated } : null;
}
