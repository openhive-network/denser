import { LoginType } from '@smart-signer/types/common';

/**
 * The brand name of the extension a session signs with, for the login types whose signer encrypts and
 * decodes a MEMO itself (see load-native-memo-signer.ts). Brand names, not translated.
 */
export const NATIVE_MEMO_SIGNER_NAME: Partial<Record<LoginType, string>> = {
  [LoginType.keychain]: 'Hive Keychain',
  [LoginType.peakvault]: 'Peak Vault',
  [LoginType.metamask]: 'MetaMask'
};
