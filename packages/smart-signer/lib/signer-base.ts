import { LoginTypes } from '@smart-signer/types/common';
import { KeyTypes } from '@smart-signer/types/common';
import { StorageType } from '@smart-signer/lib/storage-mixin';
import { THexString, transaction, createHiveChain, createWaxFoundation, operation, ITransactionBuilder } from '@hive/wax/web';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export interface SignTransaction {
  digest: THexString;
  transaction: transaction;
}

export interface BroadcastTransaction {
  operation: operation;
  translateFn?: (v: string) => string;
}

export interface SignChallenge {
  message: string;
  password?: string; // private key or password to unlock hbauth key
  translateFn?: (v: string) => string;
}

export interface SignerOptions {
  username: string;
  apiEndpoint?: string;
  storageType?: StorageType;
  keyType?: KeyTypes;
  loginType?: LoginTypes;
}

export class SignerBase {
  apiEndpoint: string;
  storageType: StorageType;
  keyType: KeyTypes;
  loginType: LoginTypes;
  username: string;

  constructor({
    username,
    apiEndpoint = 'https://api.hive.blog',
    storageType = 'localStorage',
    keyType = KeyTypes.posting,
    loginType = LoginTypes.hbauth
  }: SignerOptions) {
    this.username = username;
    this.apiEndpoint = apiEndpoint;
    this.storageType = storageType;
    this.keyType = keyType;
    this.loginType = loginType;
  }

  async destroy() {}

  async signChallenge({}: SignChallenge): Promise<string> {
    return '';
  }

  async broadcastTransaction({}: BroadcastTransaction): Promise<{
    success: boolean;
    result: string;
    error: string;
  }> {
    return { success: false, result: '', error: '' };
  }

  async createTransaction({ operation }: BroadcastTransaction) {
    const { apiEndpoint } = this;
    try {
      const hiveChain = await createHiveChain({ apiEndpoint });
      const txBuilder = await hiveChain.getTransactionBuilder();
      txBuilder.push(operation).validate();
      const tx = txBuilder.build();
      logger.info('createTransaction result: %o', tx);
      return tx;
    } catch (error) {
      logger.error('createTransaction error: %o', error);
      throw error;
    }
  }

  async signTransaction({ digest, transaction }: SignTransaction) {
    return '';
  }
}
