import { KeychainSDK, KeychainKeyTypes } from 'keychain-sdk';
import { Operation, Transaction, OperationName, VirtualOperationName, Client } from '@hiveio/dhive';
import { KeyTypes, LoginTypes } from '@smart-signer/types/common';
import { SignChallenge, BroadcastTransaction } from '@smart-signer/lib/signer';
import { formatOperations } from '@smart-signer/lib/signer-keychain';
import HiveAuthUtils from '@smart-signer/lib/hive-auth-utils';
import { isStorageAvailable } from '@smart-signer/lib/utils';
import { memoryStorage } from '@smart-signer/lib/memory-storage';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

interface SignerHiveauthOptions {
  storageType?: 'localStorage' | 'sessionStorage' | 'memoryStorage';
}


export class SignerHiveauth {

  public storage: Storage;

  constructor({
    storageType = 'localStorage'
  }: SignerHiveauthOptions = {}) {
    if (storageType === 'localStorage'
        && isStorageAvailable(storageType)) {
      this.storage = window.localStorage;
    } else if (storageType === 'sessionStorage'
        && isStorageAvailable(storageType)) {
      this.storage = window.sessionStorage;
    } else {
      this.storage = memoryStorage;
    }
  }

  async destroy() {
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
    password = '',
    loginType = LoginTypes.keychain,
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
        const { token, expire, key, challengeHex: signature } =
            authResponse.hiveAuthData;
        this.storage.setItem('hiveAuthData', JSON.stringify({ username, token, expire, key }));
        logger.info('hiveauth', { signature });
        return signature as string;
      } else {
        throw new Error('Hiveauth login failed');
      }
    } catch (error) {
      throw error;
    }
  };


  async broadcastTransaction({
    operation,
    loginType,
    username,
    keyType = KeyTypes.posting
  }: BroadcastTransaction): Promise<{ success: boolean, result: any, error: string}> {

    let result = { success: true, result: '', error: ''};
    try {
      this.setHiveAuthData();
      const operations = formatOperations(operation);
      const broadcastResponse: any = await new Promise((resolve) => {
        HiveAuthUtils.broadcast(
          operations,
          keyType,
          (res) => {
            resolve(res);
          }
        );
      });
      logger.info('SignerHiveauth.broadcastTransaction response: %o', broadcastResponse);
      if (!broadcastResponse.success) {
        throw new Error('SignerHiveauth.broadcastTransaction error');
      }
    } catch (error) {
      logger.trace('Error in SignerHiveauth.broadcastTransaction: %o', error);
      result = { success: false, result: '', error: 'Broadcast failed'};
      throw error;
    }

    return result;
  };

}
