import type { LoginType, User } from '@smart-signer/types/common';

// Every LoginType, kept complete by tsc; spelled out so the module loads without the enum
const LOGIN_TYPES: Record<`${LoginType}`, true> = {
  hbauth: true,
  keychain: true,
  peakvault: true,
  metamask: true,
  google: true,
  hiveauth: true,
  wif: true,
  passkey: true
};
const KNOWN_LOGIN_TYPES: ReadonlySet<string> = new Set(Object.keys(LOGIN_TYPES));

/**
 * Whether `user` signed in with a method this app has. A session stored with any other login type,
 * such as a removed method's, cannot sign and is to be read as signed out.
 */
export function hasKnownLoginType({ loginType }: Pick<User, 'loginType'>): boolean {
  return KNOWN_LOGIN_TYPES.has(loginType);
}
