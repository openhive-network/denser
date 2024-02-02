import { KeychainSDK, KeychainKeyTypes } from 'keychain-sdk';
import { Operation, Transaction, Client } from '@hiveio/dhive';
import { KeyTypes, LoginTypes } from '@smart-signer/types/common';
import { SignChallenge, BroadcastTransaction } from '@smart-signer/lib/signer-base';
import { operation } from '@hive/wax/web';
import { SignerBase } from '@smart-signer/lib/signer-base';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

// See https://github.com/hive-keychain/keychain-sdk

declare global {
  interface Window {
    hive_keychain: any;
  }
}

export function hasCompatibleKeychain() {
  const result =
    window.hive_keychain && window.hive_keychain.requestSignBuffer && window.hive_keychain.requestBroadcast;
  return !!result;
}

/**
 * Rewrites operation from Wax format to Keychain format.
 *
 * @export
 * @param {operation} operation
 * @returns
 */
export function formatOperations(operation: operation) {
  const operations: Operation[] = [];
  for (const [key, value] of Object.entries(operation)) {
    operations.push([key as Operation[0], value as Operation[1]]);
  }
  return operations;
}

export class SignerKeychain extends SignerBase {

  async signChallenge({
    message,
    username,
    keyType = KeyTypes.posting,
  }: SignChallenge): Promise<string> {
    logger.info('in SignerKeychain.signChallenge %o', { message, username, keyType });
    const keychain = new KeychainSDK(window, { rpc: this.apiEndpoint });
    try {
      if (!(await keychain.isKeychainInstalled())) {
        throw new Error('Keychain is not installed');
      }
      const response = await keychain.signBuffer({
        username,
        message,
        method: KeychainKeyTypes[keyType]
      });
      if (response.error) {
        throw new Error(`Error in SignerKeychain.signChallenge: ${response.error}`);
      }
      const signature = response.result as unknown as string;
      logger.info('keychain', { signature });
      return signature;
    } catch (error) {
      throw error;
    }
  }

  async broadcastTransaction({
    operation,
    username,
    keyType = KeyTypes.posting
  }: BroadcastTransaction): Promise<{ success: boolean; result: any; error: string }> {
    let result = { success: true, result: '', error: '' };
    const keychain = new KeychainSDK(window, { rpc: this.apiEndpoint });
    try {
      if (!(await keychain.isKeychainInstalled())) {
        throw new Error('Keychain is not installed');
      }
      const operations = formatOperations(operation);
      const broadcastResult = await keychain.broadcast({
        username,
        operations,
        method: KeychainKeyTypes[keyType]
      });

      if (broadcastResult.error) {
        throw new Error(`Error in SignerKeychain.signChallenge: ${broadcastResult.error}`);
      }

      result.result = broadcastResult.result as any;
    } catch (error) {
      logger.trace('Error in SignerKeychain.broadcastTransaction: %o', error);
      result = { success: false, result: '', error: 'Sign failed' };
      throw error;
    }

    return result;
  }

  /**
   * Creates transaction from given operations and signs it.
   *
   * @param {BroadcastTransaction} { operation, loginType, username,
   *     keyType = KeyTypes.posting
   *   }
   * @returns {Promise<any>}
   * @memberof SignerKeychain
   */
  async signTransaction({
    operation,
    username,
    keyType = KeyTypes.posting
  }: BroadcastTransaction): Promise<any> {
    const keychain = new KeychainSDK(window, { rpc: this.apiEndpoint });
    try {
      if (!(await keychain.isKeychainInstalled())) {
        throw new Error('Keychain is not installed');
      }
      const operations = formatOperations(operation);
      const client = new Client([this.apiEndpoint, 'https://api.openhive.network'], {
        timeout: 3000,
        failoverThreshold: 3,
        consoleOnFailover: true
      });

      const props = await client.database.getDynamicGlobalProperties();
      const headBlockNumber = props.head_block_number;
      const headBlockId = props.head_block_id;
      const expireTime = 600000;

      const tx: Transaction = {
        ref_block_num: headBlockNumber & 0xffff,
        ref_block_prefix: Buffer.from(headBlockId, 'hex').readUInt32LE(4),
        expiration: new Date(Date.now() + expireTime).toISOString().slice(0, -5),
        operations,
        extensions: []
      };

      // Sign transaction
      const signResult = await keychain.signTx({
        username,
        method: KeychainKeyTypes[keyType],
        tx
      });
      if (signResult.error) {
        throw new Error(`Error in signTx: ${signResult.error}`);
      }
    } catch (error) {
      logger.trace('SignerKeychain.broadcastTransaction error: %o', error);
      throw error;
    }
  }

}
