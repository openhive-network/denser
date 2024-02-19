import { SignerHbauth } from '@smart-signer/lib/signer/signer-hbauth';
import { SignerHiveauth } from '@smart-signer/lib/signer/signer-hiveauth';
import { SignerKeychain } from '@smart-signer/lib/signer/signer-keychain';
import { SignerWif } from '@smart-signer/lib/signer/signer-wif';
import { LoginTypes } from '@smart-signer/types/common';
import { SignerOptions } from '@smart-signer/lib/signer/signer';

export type SignerTool = SignerHbauth | SignerHiveauth | SignerKeychain | SignerWif;

export type RegisteredSigners = {
  [key in LoginTypes]?: any;
}

const registeredSigners: RegisteredSigners = {};
registeredSigners[LoginTypes.hbauth] = SignerHbauth;
registeredSigners[LoginTypes.hiveauth] = SignerHiveauth;
registeredSigners[LoginTypes.keychain] = SignerKeychain;
registeredSigners[LoginTypes.wif] = SignerWif;

export function signerFactory({
  username,
  loginType,
  keyType,
  apiEndpoint,
  storageType,
}: SignerOptions): SignerTool {
  return new registeredSigners[loginType]({
    username,
    loginType,
    keyType,
    apiEndpoint,
    storageType,
  }) as SignerTool;
}

/**
 * Creates instance of one of `SignerTool` for given `loginType` and
 * returns it. Instance signs challenges or Hive transactions with Hive
 * private keys and returns signature. Following tools are used:
 *
 * 1. [Hbauth](https://gitlab.syncad.com/hive/hb-auth), handled in
 *    SignerHbauth class.
 * 2. [Keychain](https://hive-keychain.com/), handled in SignerKeychain
 *    class.
 * 3. [Hiveauth](https://hiveauth.com/), handled in SignerHiveauthclass.
 * 4. So known "Wif" custom tool, based on
 *    [@hiveio/dhive](https://openhive-network.github.io/dhive/) and
 *    browser's localStorage, handled in SignerWif class.
 *
 * @export
 * @param {SignerOptions} options
 * @returns {SignerTool}
 */
export function getSigner(options: SignerOptions): SignerTool {
  const { loginType } = options;
  if (registeredSigners[loginType]) {
    return signerFactory(options);
  }
  throw new Error('Invalid loginType');
}
