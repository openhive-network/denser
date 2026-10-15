import type { KeyType, LoginType, User } from '@smart-signer/types/common';

/** A value of KeyType: the enums cannot load under type stripping */
export type KeyTypeName = `${KeyType}`;

/**
 * What a session can sign with: the keys it holds (`key`), posting first, and whether it can take
 * the other one in (`canAddKey`); or an external signer that picks the key for each operation
 * (`signer`), where the session's `keyType` says only what signed the login.
 */
export type LoginAuthority =
  | { kind: 'key'; keyTypes: readonly KeyTypeName[]; canAddKey: boolean }
  | { kind: 'signer'; loginType: LoginType };

const KEY_TYPES: readonly KeyTypeName[] = ['posting', 'active'];

// Values of LoginType.hbauth and LoginType.wif. Their signers sign with the keys they hold: hbauth
// with any key in safe storage, which can take in another one (signer-hbauth.ts `requireOtherKey`),
// wif with the session's key only (signer-wif.ts). Every other signer either asks for the
// operation's required key (keychain, peakvault, metamask, google) or leaves the choice to the
// external app (hiveauth, hivesigner).
const SAFE_STORAGE_LOGIN_TYPE: `${LoginType}` = 'hbauth';
const KEY_LOGIN_TYPES: ReadonlySet<string> = new Set<`${LoginType}`>([SAFE_STORAGE_LOGIN_TYPE, 'wif']);

/**
 * @param storedKeyTypes the key types safe storage holds for the account, for an hbauth session;
 * the session's own key counts as held whether or not they are known
 */
export function getLoginAuthority(
  { loginType, keyType }: Pick<User, 'loginType' | 'keyType'>,
  storedKeyTypes: readonly string[] = []
): LoginAuthority {
  if (!KEY_LOGIN_TYPES.has(loginType)) return { kind: 'signer', loginType };
  const canAddKey = loginType === SAFE_STORAGE_LOGIN_TYPE;
  const held = canAddKey ? [keyType, ...storedKeyTypes] : [keyType];
  return { kind: 'key', keyTypes: KEY_TYPES.filter((type) => held.includes(type)), canAddKey };
}

/** The key a `key` session lacks, or null when it holds both or the session uses a signer. */
export function missingKeyType(authority: LoginAuthority): KeyTypeName | null {
  if (authority.kind !== 'key') return null;
  return KEY_TYPES.find((type) => !authority.keyTypes.includes(type)) ?? null;
}

/**
 * True when `user` is signed in, but its signer cannot sign with `requiredKeyType`: a session that
 * holds another key than the one required, and has not added it to safe storage.
 */
export function lacksRequiredKeyType(
  user: User,
  requiredKeyType: KeyTypeName | undefined,
  storedKeyTypes?: readonly string[]
): boolean {
  if (!user.isLoggedIn || !requiredKeyType) return false;
  const authority = getLoginAuthority(user, storedKeyTypes);
  return authority.kind === 'key' && !authority.keyTypes.includes(requiredKeyType);
}
