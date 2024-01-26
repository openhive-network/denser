import { KeychainSDK, KeychainKeyTypes } from 'keychain-sdk';
import dhive, { Operation, Transaction } from '@hiveio/dhive';
import { KeyTypes } from '@smart-signer/types/common';

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

  async signChallenge(
    message: string,
    username: string,
    method: KeyTypes = KeyTypes.posting,
  ) {
    logger.info('in signBuffer %o', { message, username, method });
    const keychain = new KeychainSDK(window);
    try {
      if (!(await keychain.isKeychainInstalled())) {
        throw new Error('keychain is not installed');
      }
      const response = await keychain.signBuffer({
        username,
        message,
        method: KeychainKeyTypes[method],
      });
      if (response.error) {
        throw new Error(`signBuffer error: ${response.error}`);
      }
      return response.result as unknown as string;
    } catch (error) {
      throw error;
    }
  };


  async signTransaction(
    username: string,
    operations: Operation[],
    method: KeyTypes = KeyTypes.posting,
  ) {
    const keychain = new KeychainSDK(window);
    try {
      if (!(await keychain.isKeychainInstalled())) {
        throw new Error('keychain is not installed');
      }

      const client = new dhive.Client([
        'https://api.hive.blog',
        'https://api.openhive.network'
      ]);
      const props = await client.database.getDynamicGlobalProperties();
      const headBlockNumber = props.head_block_number;
      const headBlockId = props.head_block_id;
      const expireTime = 600000;

      const tx: Transaction = {
        ref_block_num: headBlockNumber & 0xffff,
        ref_block_prefix: Buffer.from(headBlockId, 'hex').readUInt32LE(4),
        expiration: new Date(Date.now() + 600000).toISOString().slice(0, -5),
        operations,
        extensions: [],
      };

      const signTx = await keychain.signTx({
        username,
        method: KeychainKeyTypes[method],
        tx,
      });
      console.info('bamboo signTx: %o', signTx);
      if (signTx.error) {
        throw new Error(`signTx error: ${signTx.error}`);
      }
      return signTx;
    } catch (error) {
      throw error;
    }
  };

}
