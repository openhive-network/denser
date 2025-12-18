import { SignChallenge } from '@smart-signer/lib/signer/signer';
import HiveAuthUtils from '@smart-signer/lib/hive-auth-utils';
import { SignTransaction, SignerOptions } from '@smart-signer/lib/signer/signer';
import { StorageMixin } from '@smart-signer/lib/storage-mixin';
import { SignerKeychain } from '@smart-signer/lib/signer/signer-keychain';
import { TTransactionPackType } from '@hiveio/wax';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

/**
 * Signs challenges (any strings) or Hive transactions with Hive private
 * keys, using [Hiveauth](https://hiveauth.com/).
 *
 * @export
 * @class SignerHiveauth
 * @extends {StorageMixin(SignerKeychain)}
 */
export class SignerHiveauth extends StorageMixin(SignerKeychain) {

  constructor(
    signerOptions: SignerOptions,
    pack: TTransactionPackType = TTransactionPackType.LEGACY
    ) {
    super(signerOptions, pack);
  }

  async destroy() {
    HiveAuthUtils.logout();
    this.storage.removeItem('hiveAuthData');
  }

  async signTransaction({ digest, transaction }: SignTransaction): Promise<string> {
    throw new Error('Not implemented');
  }

  setHiveAuthData() {
    let hiveAuthData = HiveAuthUtils.initialHiveAuthData;
    // TODO check `expire` property – don't use expired token.
    const data = this.storage.getItem('hiveAuthData');
    if (data) {
      hiveAuthData = JSON.parse(data);
    }
    HiveAuthUtils.setUsername(hiveAuthData?.username || '');
    HiveAuthUtils.setToken(hiveAuthData?.token || '');
    HiveAuthUtils.setExpire(hiveAuthData?.expire || 0);
    HiveAuthUtils.setKey(hiveAuthData?.key || '');
  }

  async signChallenge({ message, translateFn = (v) => v }: SignChallenge): Promise<string> {
    const { username, keyType } = this;
    logger.info('in SignerHiveauth.signChallenge %o', { message, username, keyType });
    try {
      this.setHiveAuthData();
      const authResponse: any = await new Promise((resolve) => {
        HiveAuthUtils.login(
          username,
          typeof message === 'string' ? message : JSON.stringify(message),
          (res) => {
            resolve(res);
          },
          translateFn
        );
      });

      if (authResponse.success && authResponse.hiveAuthData) {
        const { token, expire, key, challengeHex: signature } = authResponse.hiveAuthData;
        this.storage.setItem('hiveAuthData', JSON.stringify({ username, token, expire, key }));
        logger.info('hiveauth', { signature });
        return signature as string;
      } else {
        throw new Error('Hiveauth login failed');
      }
    } catch (error) {
      throw error;
    }
  }

}
