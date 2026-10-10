import type { ApiAuthority } from '@hiveio/wax';

export type KeyRole = 'owner' | 'active' | 'posting';

export type AccountAuthorities = Record<KeyRole, ApiAuthority>;

const ROLES_STRONGEST_FIRST: readonly KeyRole[] = ['owner', 'active', 'posting'];

/**
 * Returns the strongest of the account's authorities that lists `publicKey` among its keys, or
 * null when none of them does.
 */
export function findKeyRole(account: AccountAuthorities, publicKey: string): KeyRole | null {
  return (
    ROLES_STRONGEST_FIRST.find((role) => account[role].key_auths.some(({ 0: key }) => key === publicKey)) ?? null
  );
}
