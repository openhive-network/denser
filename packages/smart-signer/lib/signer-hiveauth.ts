import { KeyTypes } from '@smart-signer/types/common';
import { SignChallenge, BroadcastTransaction } from '@smart-signer/lib/signer-base';
import { waxToKeychainOperation } from '@smart-signer/lib/signer-keychain';
import HiveAuthUtils from '@smart-signer/lib/hive-auth-utils';
import { SignerBase } from '@smart-signer/lib/signer-base';
import { StorageMixin } from '@smart-signer/lib/storage-mixin';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Instance interacts with Hive private keys, signs messages or
 * operations, and sends operations to Hive blockchain. It uses
 * [Hiveauth](https://hiveauth.com/).
 *
 * @export
 * @class SignerHiveauth
 * @extends {StorageMixin(SignerBase)}
 */
export class SignerHiveauth extends StorageMixin(SignerBase) {
  async destroy(username: string) {
    HiveAuthUtils.logout();
    this.storage.removeItem('hiveAuthData');
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

  async signChallenge({
    message,
    username,
    keyType = KeyTypes.posting,
    translateFn = (v) => v
  }: SignChallenge): Promise<string> {
    logger.info('in SignerHiveauth.signChallenge %o', { message, username, keyType });
    try {
      this.setHiveAuthData();
      const authResponse: any = await new Promise((resolve) => {
        HiveAuthUtils.login(
          username,
          message,
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

  async broadcastTransaction({
    operation,
    keyType = KeyTypes.posting
  }: BroadcastTransaction): Promise<{ success: boolean; result: any; error: string }> {
    let result = { success: true, result: '', error: '' };
    try {
      this.setHiveAuthData();
      const operations = waxToKeychainOperation(operation);
      const broadcastResponse: any = await new Promise((resolve) => {
        HiveAuthUtils.broadcast(operations, keyType, (res) => {
          resolve(res);
        });
      });
      logger.info('SignerHiveauth.broadcastTransaction response: %o', broadcastResponse);
      if (!broadcastResponse.success) {
        throw new Error('SignerHiveauth.broadcastTransaction error');
      }
    } catch (error) {
      logger.error('Error in SignerHiveauth.broadcastTransaction: %o', error);
      result = { success: false, result: '', error: 'Broadcast failed' };
      throw error;
    }

    return result;
  }
}
