import { KeychainSDK, KeychainKeyTypes } from 'keychain-sdk';
import { Operation, Transaction, Client } from '@hiveio/dhive';
import { KeyTypes, LoginTypes } from '@smart-signer/types/common';
import { SignChallenge, BroadcastTransaction, SignTransaction, SignerBase } from '@smart-signer/lib/signer-base';
import { createWaxFoundation, operation, ITransactionBuilder } from '@hive/wax/web';
import { createHiveChain, BroadcastTransactionRequest, THexString } from '@hive/wax/web';

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
export function waxToKeychainOperation(operation: operation) {
  const operations: Operation[] = [];
  for (const [key, value] of Object.entries(operation)) {
    operations.push([key as Operation[0], value as Operation[1]]);
  }
  return operations;
}

/**
 * Instance interacts with Hive private keys, signs messages or
 * operations, and sends operations to Hive blockchain. It uses
 * [Keychain](https://hive-keychain.com/).
 *
 * @export
 * @class SignerKeychain
 * @extends {SignerBase}
 */
export class SignerKeychain extends SignerBase {

  async signChallenge({
    message,
  }: SignChallenge): Promise<string> {
    const { username, keyType } = this;
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
  }: BroadcastTransaction): Promise<{ success: boolean; result: any; error: string }> {
    const { username, keyType } = this;
    let result = { success: true, result: '', error: '' };
    const keychain = new KeychainSDK(window, { rpc: this.apiEndpoint });
    try {
      if (!(await keychain.isKeychainInstalled())) {
        throw new Error('Keychain is not installed');
      }
      const operations = waxToKeychainOperation(operation);
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
      logger.error('Error in SignerKeychain.broadcastTransaction: %o', error);
      result = { success: false, result: '', error: 'Sign failed' };
      throw error;
    }

    return result;
  }

  /**
   * Creates transaction from given operations and signs it.
   *
   * @param {BroadcastTransaction} {
   *     operation,
   *     username,
   *     keyType = KeyTypes.posting
   *   }
   * @returns {Promise<any>}
   * @memberof SignerKeychain
   */
  async signTransactionOld({
    operation,
  }: BroadcastTransaction): Promise<any> {
    const { username, keyType } = this;
    const keychain = new KeychainSDK(window, { rpc: this.apiEndpoint });
    try {
      if (!(await keychain.isKeychainInstalled())) {
        throw new Error('Keychain is not installed');
      }
      const operations = waxToKeychainOperation(operation);
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
      logger.info(signResult);
      if (signResult.error) {
        throw new Error(`Error in signTx: ${signResult.error}`);
      }
      return signResult.result.signatures[0];
    } catch (error) {
      logger.error('SignerKeychain.broadcastTransaction error: %o', error);
      throw error;
    }
  }


  async createTransaction({ operation }: BroadcastTransaction) {
    const { apiEndpoint } = this;
    try {
      const hiveChain = await createHiveChain({ apiEndpoint });
      const tx = await hiveChain.getTransactionBuilder();
      tx.push(operation).validate();
      const result = { transaction: tx.toApi(), digest: tx.sigDigest }
      logger.info('createTransaction result: %o', result);
      return result;
    } catch (error) {
      logger.error('SignerHbauth.createTransaction error: %o', error);
      throw error;
    }
  }

  async signTransaction({ digest, transaction }: SignTransaction) {
    const { username, keyType } = this;
    const keychain = new KeychainSDK(window, { rpc: this.apiEndpoint });

    const wax = await createWaxFoundation();
    let tx: ITransactionBuilder;

    // tx = new wax.TransactionBuilder(JSON.parse(transaction));
    tx = wax.TransactionBuilder.fromApi(transaction);
    logger.info('signTransaction digests: %o', {digest, 'tx.sigDigest': tx.sigDigest})
    if (digest !== tx.sigDigest) throw new Error('Digests do not match');

    // Show transaction to user and get his consent to sign it. But as a
    // matter of fact Keychain extension could do it.

    try {
      if (!(await keychain.isKeychainInstalled())) {
        throw new Error('Keychain is not installed');
      }
      // Sign transaction
      const signResult = await keychain.signTx({
        username,
        method: KeychainKeyTypes[keyType],
        tx: JSON.parse(transaction)
      });
      logger.info(signResult);
      if (signResult.error) {
        throw new Error(`Error in signTx: ${signResult.error}`);
      }
      return '';
    } catch (error) {
      logger.error('SignerKeychain.signTransaction error: %o', error);
      throw error;
    }
  }

}
