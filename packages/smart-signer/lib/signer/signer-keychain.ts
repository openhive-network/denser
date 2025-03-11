import { KeychainSDK, KeychainKeyTypes } from 'keychain-sdk';
import { Operation, TransferOperation } from '@hiveio/dhive';
import { SignChallenge, SignTransaction, Signer, SignerOptions } from '@smart-signer/lib/signer/signer';
import { createWaxFoundation, operation, TTransactionPackType } from '@hiveio/wax';
import KeychainProvider from '@hiveio/wax-signers-keychain';

import { getLogger } from '@hive/ui/lib/logging';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
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
            memo: value['memo']
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
  private keychainProvider: KeychainProvider;

  constructor(signerOptions: SignerOptions, pack: TTransactionPackType = TTransactionPackType.LEGACY) {
    super(signerOptions, pack);
    this.keychainProvider = KeychainProvider.for(signerOptions.username, signerOptions.keyType);
  }

  async destroy(): Promise<void> {}

  async signChallenge({ message }: SignChallenge): Promise<string> {
    console.log;
    const { username, keyType } = this;
    logger.info('in SignerKeychain.signChallenge %o', { message, username, keyType });
    const keychain = new KeychainSDK(window, { rpc: this.apiEndpoint });
    try {
      if (!(await keychain.isKeychainInstalled())) {
        throw new Error('Keychain is not installed');
      }
      const response = await keychain.signBuffer({
        username,
        message: typeof message === 'string' ? message : JSON.stringify(message),
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
      const provider = KeychainProvider.for(this.username, this.keyType);

      const authTx = await (await hiveChainService.getHiveChain()).createTransaction();

      authTx.pushOperation({
        custom_json: {
          id: 'login',
          json: JSON.stringify({
            username: this.username,
            keyType: this.keyType,
            description: 'You are logging in to Denser using Hive Keychain'
          }),
          required_auths: [],
          required_posting_auths: [this.username] // in case
        }
      });

      await authTx.sign(provider);

      console.log('authTx', authTx);

      await (
        await hiveChainService.getHiveChain()
      ).api.database_api.verify_authority({
        trx: authTx.toApiJson(),
        pack: TTransactionPackType.LEGACY
      });

      return authTx.sigDigest;
    } catch (error) {
      logger.error('SignerKeychain.signTransaction error: %o', error);
      throw error;
    }
  }
}
