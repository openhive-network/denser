import type { PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { fetchLoginChallenge } from '@smart-signer/lib/auth/login-challenge';
import { hiveAuthLoginMessage } from '@smart-signer/lib/hiveauth/login-message';
import type { SignerOptions } from '@smart-signer/lib/signer/signer';
import { LoginType } from '@smart-signer/types/common';

/**
 * The login data of a HiveAuth sign-in: the user approves a new HAS session in the wallet app, which
 * signs the login challenge with the account's `keyType` key. No transaction is sent (`txJSON` is
 * `null`): the server checks the signature against the account's authority (`verifyLoginChallenge`).
 */
export async function signInWithHiveAuth(
  signerOptions: SignerOptions,
  authenticateOnBackend: boolean
): Promise<PostLoginSchema> {
  const [{ SignerHiveauth }, loginChallenge] = await Promise.all([
    import('@smart-signer/lib/signer/signer-hiveauth'),
    fetchLoginChallenge()
  ]);
  const signer = new SignerHiveauth({ ...signerOptions, loginType: LoginType.hiveauth });
  const signature = await signer.signIn(hiveAuthLoginMessage(loginChallenge));
  const { username, keyType } = signerOptions;
  return {
    username,
    loginType: LoginType.hiveauth,
    keyType,
    txJSON: 'null',
    pack: signer.pack,
    signatures: { posting: '', active: '', [keyType]: signature },
    authenticateOnBackend
  };
}
