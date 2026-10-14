import type { KeyType, LoginType, User } from '@smart-signer/types/common';

/**
 * What a session can sign with: one key it holds (`key`), or an external signer that picks the key
 * for each operation (`signer`), where the session's `keyType` says only what signed the login.
 */
export type LoginAuthority = { kind: 'key'; keyType: KeyType } | { kind: 'signer'; loginType: LoginType };

// Values of LoginType.hbauth and LoginType.wif: the enums cannot load under type stripping. Their
// signers sign with the session's keyType only (signer-hbauth.ts, signer-wif.ts); every other signer
// either asks for the operation's required key (keychain, peakvault, metamask, google) or leaves the
// choice to the external app (hiveauth, hivesigner).
const SINGLE_KEY_LOGIN_TYPES: ReadonlySet<string> = new Set<`${LoginType}`>(['hbauth', 'wif']);

export function getLoginAuthority({
  loginType,
  keyType
}: Pick<User, 'loginType' | 'keyType'>): LoginAuthority {
  return SINGLE_KEY_LOGIN_TYPES.has(loginType) ? { kind: 'key', keyType } : { kind: 'signer', loginType };
}
