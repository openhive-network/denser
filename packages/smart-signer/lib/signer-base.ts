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
  loginType: LoginTypes;
  keyType: KeyTypes;
  apiEndpoint: string;
  storageType: StorageType;
}

export class SignerBase {

  username: string;
  loginType: LoginTypes;
  keyType: KeyTypes;
  apiEndpoint: string;
  storageType: StorageType;

  constructor({
    username,
    loginType,
    keyType,
    apiEndpoint,
    storageType,
  }: SignerOptions) {
    if (username) {
      this.username = username;
    } else {
      throw new Error('SignerBase constructor: username must be non-empty string');
    }
    if (loginType) {
      this.loginType = loginType;
    } else {
      throw new Error('SignerBase constructor: loginType must be non-empty string');
    }
    if (keyType) {
      this.keyType = keyType;
    } else {
      throw new Error('SignerBase constructor: keyType must be non-empty string');
    }
    if (apiEndpoint) {
      this.apiEndpoint = apiEndpoint;
    } else {
      throw new Error('SignerBase constructor: apiEndpoint must be non-empty string');
    }
    if (storageType) {
      this.storageType = storageType;
    } else {
      throw new Error('SignerBase constructor: storageType must be non-empty string');
    }
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
