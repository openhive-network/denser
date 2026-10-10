import type { SignerTool } from '@smart-signer/lib/signer/get-signer';
import { KeyType, LoginType } from '@smart-signer/types/common';

// Login types whose Signer encrypts and decrypts a MEMO itself, through its browser extension
// (Signer.encryptData / decryptData). hb-auth's key store only knows active/posting/owner, and
// HiveAuth's relay holds no key locally: those users enter the MEMO private key instead.
const NATIVE_MEMO_LOGIN_TYPES: ReadonlySet<LoginType> = new Set([LoginType.keychain, LoginType.peakvault]);

export const hasNativeMemoCrypto = (loginType: LoginType): boolean => NATIVE_MEMO_LOGIN_TYPES.has(loginType);

const isExtensionInstalled = async (loginType: LoginType): Promise<boolean> => {
  if (loginType === LoginType.keychain) {
    return (await import('@smart-signer/lib/signer/signer-keychain')).hasCompatibleKeychain();
  }
  return (await import('@smart-signer/lib/signer/signer-peakvault')).hasCompatiblePeakvault();
};

/**
 * Resolves to `username`'s signer when `loginType` can encrypt and decrypt memos itself and its
 * extension is installed, else to null. The signer modules (and wax) are imported on the call, so
 * call it from a user action, never on render.
 */
export async function loadNativeMemoSigner(username: string, loginType: LoginType): Promise<SignerTool | null> {
  if (!hasNativeMemoCrypto(loginType) || !(await isExtensionInstalled(loginType))) return null;
  const { getSigner } = await import('@smart-signer/lib/signer/get-signer');
  return getSigner({
    username,
    loginType,
    // Unused by encryptData/decryptData, which use the 'memo' role; the Signer requires a KeyType.
    keyType: KeyType.posting,
    storageType: 'localStorage'
  });
}
