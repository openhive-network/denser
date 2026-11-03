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
  /**
   * Another account's key, an account the account's `keyType` authority lists in `account_auths`,
   * of the holder's own `keyType` authority, each weight meeting its authority's threshold
   */
  | { kind: 'authorised-account'; owner: string }
  /** Another account's key that the account's `keyType` authority does not take through `account_auths` */
  | { kind: 'unrelated-account'; owner: string };

/** An account holding a key, with its authorities */
export type KeyHolder = AccountAuthorities & { name: string };

/** Whether `authority` lists `entry` at a weight that meets its threshold on its own */
function meetsThresholdAlone(authority: ApiAuthority, entries: 'account_auths' | 'key_auths', entry: string) {
  return authority[entries].some(
    ({ 0: name, 1: weight }) => name === entry && weight >= authority.weight_threshold
  );
}

/**
 * Whether `holder`'s `publicKey` alone signs for `account` as its `keyType` key through
 * `account_auths`: the account's `keyType` authority lists the holder at a weight meeting its
 * threshold, and the holder's own `keyType` authority lists the key at a weight meeting the holder's
 * threshold. Hived checks an account named in `account_auths` against that account's authority of
 * the role being verified (its active one for active, its posting one for posting), so a holder's
 * posting key does not sign as active, nor its active or owner key as posting. A multisig setup,
 * where either weight falls short, needs further signatures and does not count.
 */
function signsThroughAccountAuths(
  account: AccountAuthorities,
  holder: KeyHolder,
  publicKey: string,
  keyType: Exclude<KeyRole, 'owner'>
): boolean {
  return (
    meetsThresholdAlone(account[keyType], 'account_auths', holder.name) &&
    meetsThresholdAlone(holder[keyType], 'key_auths', publicKey)
  );
}

/**
 * Classifies `publicKey` offered as `account`'s `keyType` key, given `keyHolders`, the accounts
 * whose authorities list it (`account_by_key_api.get_key_references`) with their authorities. Null
 * when the key may sign as `keyType`, or when it is none of the account's keys and no other account
 * is known to hold it. A holder is authorised only when the account's `keyType` authority lists it
 * in `account_auths` and the key is of the holder's own `keyType` authority, each at a weight meeting
 * that authority's threshold; such a holder wins over the others when several accounts hold the key.
 */
export function classifyKeyRefusal(
  account: AccountAuthorities & { name: string },
  publicKey: string,
  keyType: Exclude<KeyRole, 'owner'>,
  keyHolders: readonly KeyHolder[]
): KeyRefusal | null {
  if (findKeyRoles(account, publicKey).length > 0) {
    return isKeyOfOtherRole(account, publicKey, keyType) ? { kind: 'own-other-role' } : null;
  }
  const otherHolders = keyHolders.filter((holder) => holder.name !== account.name);
  const authorised = otherHolders.find((holder) =>
    signsThroughAccountAuths(account, holder, publicKey, keyType)
  );
  if (authorised) return { kind: 'authorised-account', owner: authorised.name };
  const [unrelated] = otherHolders;
  return unrelated ? { kind: 'unrelated-account', owner: unrelated.name } : null;
}
