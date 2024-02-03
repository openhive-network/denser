import { SignerHbauth } from '@smart-signer/lib/signer-hbauth';
import { SignerHiveauth } from '@smart-signer/lib/signer-hiveauth';
import { SignerKeychain } from '@smart-signer/lib/signer-keychain';
import { SignerWif } from '@smart-signer/lib/signer-wif';
import { LoginTypes } from '@smart-signer/types/common';
import { KeyTypes } from '@smart-signer/types/common';
import { SignerBase, SignChallenge, BroadcastTransaction } from '@smart-signer/lib/signer-base';

export type { BroadcastTransaction, SignChallenge, SignerOptions } from '@smart-signer/lib/signer-base';

// export * from '@hive/wax'; // TODO Consider this.
export { vote, update_proposal_votes, operation } from '@hive/wax/web';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

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
   * Creates instance of Signer for given `loginType` and returns it.
   *
   * @private
   * @param {LoginTypes} [loginType=LoginTypes.wif]
   * @param {*} [apiEndpoint=this.apiEndpoint]
   * @returns
   * @memberof Signer
   */
  private getSigner(loginType: LoginTypes = LoginTypes.wif, apiEndpoint = this.apiEndpoint) {
    let signer: SignerHbauth | SignerHiveauth | SignerKeychain | SignerWif;
    const args = { apiEndpoint };
    if (loginType === LoginTypes.hbauth) {
      signer = new SignerHbauth(args);
    } else if (loginType === LoginTypes.hiveauth) {
      signer = new SignerHiveauth(args);
    } else if (loginType === LoginTypes.keychain) {
      signer = new SignerKeychain(args);
    } else if (loginType === LoginTypes.wif) {
      signer = new SignerWif(args);
    } else {
      throw new Error('Invalid loginType');
    }
    return signer;
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
   *     loginType,
   *     username,
   *     password = '', // private key or password to unlock hbauth key
   *     keyType = KeyTypes.posting,
   *     translateFn = (v) => v
   *   }
   * @returns {Promise<string>}
   * @memberof Signer
   */
  async signChallenge({
    message,
    loginType,
    username,
    password = '', // private key or password to unlock hbauth key
    keyType = KeyTypes.posting,
    translateFn = (v) => v
  }: SignChallenge): Promise<string> {
    logger.info('in signChallenge %o', { loginType, username, password, keyType, message });
    const signer = this.getSigner(loginType);
    try {
      const signature = await signer.signChallenge({
        message,
        username,
        keyType,
        password,
        loginType,
        translateFn
      });
      return signature;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Creates Hive transaction for given operation, signs it and
   * broadcasts it to Hive blockchain.
   *
   * @param {BroadcastTransaction} {
   *     operation,
   *     loginType,
   *     username,
   *     keyType = KeyTypes.posting,
   *     translateFn = (v) => v
   *   }
   * @returns {Promise<any>}
   * @memberof Signer
   */
  async broadcastTransaction({
    operation,
    loginType,
    username,
    keyType = KeyTypes.posting,
    translateFn = (v) => v
  }: BroadcastTransaction): Promise<any> {
    logger.info('in broadcastTransaction: %o', {
      operation,
      loginType,
      username,
      keyType
    });
    const signer = this.getSigner(loginType);
    return signer.broadcastTransaction({
      operation,
      loginType,
      username,
      keyType,
      translateFn
    });
  }

  /**
   * Clears all user data in storages and memory, does other things,
   * if required for particular Signer.
   *
   * @param {string} username
   * @param {LoginTypes} loginType
   * @memberof Signer
   */
  async destroy(username: string, loginType: LoginTypes) {
    const signer = this.getSigner(loginType);
    return signer.destroy(username, loginType);
  }

}
