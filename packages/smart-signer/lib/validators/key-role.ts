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
