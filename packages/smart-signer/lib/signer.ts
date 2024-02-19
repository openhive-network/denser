import { SignerHbauth } from '@smart-signer/lib/signer-hbauth';
import { SignerHiveauth } from '@smart-signer/lib/signer-hiveauth';
import { SignerKeychain } from '@smart-signer/lib/signer-keychain';
import { SignerWif } from '@smart-signer/lib/signer-wif';
import { LoginTypes } from '@smart-signer/types/common';
import {
  SignerBase,
  SignChallenge,
  BroadcastTransaction,
  SignTransaction,
  SignerOptions
} from '@smart-signer/lib/signer-base';

export type {
  BroadcastTransaction,
  SignChallenge,
  SignerOptions,
  SignTransaction
} from '@smart-signer/lib/signer-base';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export type Signers = SignerHbauth | SignerHiveauth | SignerKeychain | SignerWif;
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
}: SignerOptions): Signers {
  return new registeredSigners[loginType]({
    username,
    loginType,
    keyType,
    apiEndpoint,
    storageType,
  }) as Signers;
}


/**
 * Instance interacts with Hive private keys, signs messages or
 * operations, and sends operations to Hive blockchain. It is instance
 * builder, which delegates particular tasks to other instances, each
 * responsible for using one of the following tools:
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
 * @class Signer
 * @extends {SignerBase}
 */
export class Signer extends SignerBase {
  /**
   * Creates instance of `signer` for given `loginType` and returns it.
   *
   * @private
   * @returns
   * @memberof Signer
   */
  private getSigner(): Signers {
    const { username, apiEndpoint, storageType, keyType, loginType } = this;
    const options = { username, apiEndpoint, storageType, keyType, loginType };
    if (registeredSigners[loginType]) {
      return signerFactory(options);
    }
    throw new Error('Invalid loginType');
  }

  /**
   * Calculates sha256 digest (hash) of any string and signs it with
   * Hive private key. It's good for verifying keys, in login
   * procedure for instance. However it's bad for signing Hive
   * transactions – these need different hashing method and other
   * special treatment.
   *
   * @param {SignChallenge} {
   *     message,
   *     password = '', // private key or password to unlock hbauth key
   *     translateFn = (v) => v
   *   }
   * @returns {Promise<string>}
   * @memberof Signer
   */
  async signChallenge({
    message,
    password = '', // private key or password to unlock hbauth key
    translateFn = (v) => v
  }: SignChallenge): Promise<string> {
    const { loginType, username, keyType } = this;
    logger.info('in signChallenge %o', { loginType, username, password, keyType, message });
    const signer = this.getSigner();
    try {
      const signature = await signer.signChallenge({
        message,
        password,
        translateFn
      });
      return signature;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clears all user data in storages and memory, does other required
   * things for particular Signer.
   *
   * @returns
   * @memberof Signer
   */
  async destroy() {
    const signer = this.getSigner();
    return signer.destroy();
  }

  async createTransaction({ operation }: BroadcastTransaction) {
    const signer = this.getSigner();
    return signer.createTransaction({ operation });
  }

  async signTransaction({ digest, transaction }: SignTransaction) {
    const signer = this.getSigner();
    return signer.signTransaction({ digest, transaction });
  }
}
