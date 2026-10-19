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
  return ROLES_STRONGEST_FIRST.filter((role) => account[role].key_auths.some(({ 0: key }) => key === publicKey));
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
