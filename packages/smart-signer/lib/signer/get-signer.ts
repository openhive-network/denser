import { SignerGoogleDrive } from '@smart-signer/lib/signer/signer-google-drive';
import { SignerHbauth } from '@smart-signer/lib/signer/signer-hbauth';
import { SignerHiveauth } from '@smart-signer/lib/signer/signer-hiveauth';
import { SignerKeychain } from '@smart-signer/lib/signer/signer-keychain';
import { SignerPeakvault } from '@smart-signer/lib/signer/signer-peakvault';
import { SignerMetaMask } from '@smart-signer/lib/signer/signer-metamask';
import { SignerWif } from '@smart-signer/lib/signer/signer-wif';
import { LoginType } from '@smart-signer/types/common';
import { Signer, SignerOptions } from '@smart-signer/lib/signer/signer';

export type SignerTool = SignerHbauth | SignerHiveauth | SignerKeychain | SignerPeakvault | SignerMetaMask | SignerGoogleDrive | SignerWif;
export type RegisteredSigners = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Signer subclass constructors have varying signatures (options, pack)
  [key in LoginType]?: any;
};

const registeredSigners: RegisteredSigners = {};
registeredSigners[LoginType.Hbauth] = SignerHbauth;
registeredSigners[LoginType.Hiveauth] = SignerHiveauth;
registeredSigners[LoginType.Keychain] = SignerKeychain;
registeredSigners[LoginType.Metamask] = SignerMetaMask;
registeredSigners[LoginType.Google] = SignerGoogleDrive;
registeredSigners[LoginType.Peakvault] = SignerPeakvault;
registeredSigners[LoginType.Wif] = SignerWif;

function signerFactory({
  username,
  loginType,
  keyType,
  storageType,
}: SignerOptions): Signer {
  const SignerClass = registeredSigners[loginType];
  if (!SignerClass) {
    throw new Error(`Invalid loginType: ${loginType}`);
  }
  return new SignerClass({
    username,
    loginType,
    keyType,
    storageType,
  }) as Signer;
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
 * 4. So known "Wif" custom tool
 * 5. [Peakvault](https://vault.peakd.com/), handled in SignerPeakvault
 *    class.
 * 6. [MetaMask](https://metamask.io/), handled in SignerMetaMask class.
 * 7. [Google Drive](https://gitlab.syncad.com/hive/wax/-/blob/develop/examples/ts/signers-external/README.md),
 *    handled in SignerGoogleDrive class.
 *
 * @export
 * @param {SignerOptions} options
 * @returns {SignerTool}
 */
export function getSigner(options: SignerOptions): Signer {
  const { loginType } = options;
  if (registeredSigners[loginType]) {
    return signerFactory(options);
  }
  throw new Error('Invalid loginType');
}
