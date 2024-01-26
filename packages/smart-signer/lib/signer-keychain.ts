import { KeychainSDK, KeychainKeyTypes } from 'keychain-sdk';
import { Operation, Transaction, OperationName, VirtualOperationName, Client } from '@hiveio/dhive';
import { KeyTypes, LoginTypes } from '@smart-signer/types/common';
import { SignChallenge, BroadcastOperation } from '@smart-signer/lib/signer';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

// See https://github.com/hive-keychain/keychain-sdk


declare global {
  interface Window {
      hive_keychain: any;
  }
}


export function hasCompatibleKeychain() {
  const result = (
      window.hive_keychain
      && window.hive_keychain.requestSignBuffer
      && window.hive_keychain.requestBroadcast
  );
  return !!result;
}


export class SignerKeychain {

  async signChallenge({
    message,
    username,
    keyType = KeyTypes.posting,
    password = '',
    loginType = LoginTypes.keychain
  }: SignChallenge): Promise<any> {
    logger.info('in signBuffer %o', { message, username, keyType });
    const keychain = new KeychainSDK(window, { rpc: 'https://api.hive.blog' });
    try {
      if (!(await keychain.isKeychainInstalled())) {
        throw new Error('keychain is not installed');
      }
      const response = await keychain.signBuffer({
        username,
        message,
        method: KeychainKeyTypes[keyType],
      });
      if (response.error) {
        throw new Error(`signBuffer error: ${response.error}`);
      }
      return response.result as unknown as string;
    } catch (error) {
      throw error;
    }
  };

  async broadcastOperation({
    operation,
    loginType,
    username,
    keyType = KeyTypes.posting
  }: BroadcastOperation): Promise<{ success: boolean, result: any, error: string}> {

    let result = { success: true, result: '', error: ''};
    const keychain = new KeychainSDK(window, { rpc: 'https://api.hive.blog' });
    try {
      if (!(await keychain.isKeychainInstalled())) {
        throw new Error('keychain is not installed');
      }

      // Format operation for Keychain
      const operations: Operation[] = [];
      for (const [key, value] of Object.entries(operation)) {
        operations.push(
          [
            key as OperationName | VirtualOperationName,
            value
          ]
          )
      }

      // Broadcast
      const broadcastResult = await keychain.broadcast(
        {
          username,
          operations,
          method: KeychainKeyTypes[keyType],
        }
      )

      console.info('bamboo signTx: %o', broadcastResult);
      if (broadcastResult.error) {
        throw new Error(`signTx error: ${broadcastResult.error}`);
      }

      result.result = broadcastResult.result as any;

    } catch (error) {
      logger.trace('SignerKeychain.broadcastOperation error: %o', error);
      result = { success: false, result: '', error: 'Sign failed'};
      throw error;
    }

    return result;
  };

  async signTransaction({
    operation,
    loginType,
    username,
    keyType = KeyTypes.posting
  }: BroadcastOperation): Promise<any> {

    const keychain = new KeychainSDK(window, { rpc: 'https://api.hive.blog' });
    try {
      if (!(await keychain.isKeychainInstalled())) {
        throw new Error('keychain is not installed');
      }

      // Format operation for Keychain
      const operations: Operation[] = [];
      for (const [key, value] of Object.entries(operation)) {
        operations.push([
          key as OperationName | VirtualOperationName,
          value
        ]);
      }

      const client = new Client(
        [
          'https://api.hive.blog',
          'https://api.openhive.network'
        ],
        {
          timeout: 3000,
          failoverThreshold: 3,
          consoleOnFailover: true,
        }
      );

      const props = await client.database.getDynamicGlobalProperties();
      const headBlockNumber = props.head_block_number;
      const headBlockId = props.head_block_id;
      const expireTime = 600000;

      const tx: Transaction = {
        ref_block_num: headBlockNumber & 0xffff,
        ref_block_prefix: Buffer.from(headBlockId, 'hex').readUInt32LE(4),
        expiration: new Date(Date.now() + expireTime).toISOString().slice(0, -5),
        operations,
        extensions: [],
      };

      // Sign transaction
      const signResult = await keychain.signTx({
        username,
        method: KeychainKeyTypes[keyType],
        tx,
      });
      console.info('bamboo signTx: %o', signResult);
      if (signResult.error) {
        throw new Error(`signTx error: ${signResult.error}`);
      }

    } catch (error) {
      logger.trace('SignerKeychain.broadcastOperation error: %o', error);
      throw error;
    }
  };

}