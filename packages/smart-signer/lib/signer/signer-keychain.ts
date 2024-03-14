import { KeychainSDK, KeychainKeyTypes } from 'keychain-sdk';
import { Operation, TransferOperation } from '@hiveio/dhive';
import {
  SignChallenge,
  SignTransaction,
  Signer
} from '@smart-signer/lib/signer/signer';
import { createWaxFoundation, operation, ApiTransaction, ApiOperation } from '@hive/wax/web';

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
 * Rewrites operations from Wax format to Keychain format.
 *
 * @export
 * @param {(operation | operation[])} operation
 * @returns
 */
export function waxToKeychainOperation(operation: operation | operation[]) {
  const keychainOperations: Operation[] = [];

  if (!Array.isArray(operation)) operation = [operation];

  for (const o of operation) {
    for (const [key, value] of Object.entries(o)) {
      if (key === 'transfer') {
        // Naive workaroud for transfer, just to make login working.
        // TODO Should be changed after upcoming update in Wax.
        const transferOperation: TransferOperation = [
          'transfer',
          {
            from: value['from_account'],
            to: value['to_account'],
            amount: '0.001 HIVE',
            memo: value['memo'],
          }
        ];
        keychainOperations.push(transferOperation);
      } else {
        keychainOperations.push([key as Operation[0], value as Operation[1]]);
      }
    }
  }

  return keychainOperations;
}

/**
 * Signs challenges (any strings) or Hive transactions with Hive private
 * keys, using [Keychain](https://hive-keychain.com/).
 *
 * @export
 * @class SignerKeychain
 * @extends {Signer}
 */
export class SignerKeychain extends Signer {

  async destroy(): Promise<void> {}

  async signChallenge({ message }: SignChallenge): Promise<string> {
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
      // There's not digest in response.
      logger.info('SignerKeychain.signChallenge keychain response: %o', response);
      if (response.error) {
        throw new Error(`Error in SignerKeychain.SignerKeychain.signChallenge: ${response.error}`);
      }
      // TODO We can also return response.publicKey. This could be
      // useful in signature's verification.
      const signature = response.result as unknown as string;
      logger.info('keychain', { signature });
      return signature;
    } catch (error) {
      throw error;
    }
  }

  async signTransaction({ digest, transaction }: SignTransaction): Promise<string> {
    try {
      const { username, keyType } = this;
      const keychain = new KeychainSDK(window, { rpc: this.apiEndpoint });

      const wax = await createWaxFoundation();
      const txBuilder = new wax.TransactionBuilder(transaction);
      logger.info('signTransaction digests: %o', { digest, 'txBuilder.sigDigest': txBuilder.sigDigest });
      if (digest !== txBuilder.sigDigest) throw new Error('Digests do not match');

      // At this point we normally show transaction to user and get
      // his consent to sign it, but here we assume that Keychain will
      // do it.

      const tx = txBuilder.build();

      logger.info('signTransaction tx: %o', {
        tx,
        toApi: JSON.parse(txBuilder.toApi()),
        toLegacyApi: JSON.parse(txBuilder.toLegacyApi() ),
      });

      if (!(await keychain.isKeychainInstalled())) {
        throw new Error('Keychain is not installed');
      }
      // Sign transaction. There's not digest nor publicKey in response.
      const signResult = await keychain.signTx({
        username,
        method: KeychainKeyTypes[keyType],
        tx: JSON.parse(txBuilder.toLegacyApi())
      });
      logger.info('SignerKeychain.signTransaction keychain response: %o', signResult);
      if (signResult.error) {
        throw new Error(`Error in signTx: ${signResult.error}`);
      }
      return signResult.result.signatures[0];
    } catch (error) {
      logger.error('SignerKeychain.signTransaction error: %o', error);
      throw error;
    }
  }

}
