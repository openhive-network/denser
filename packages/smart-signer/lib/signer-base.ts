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

export abstract class SignerBase {

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

  /**
   * Clears all user data in storages and memory, does other required
   * things for particular Signer.
   *
   * @abstract
   * @returns {Promise<void>}
   * @memberof SignerBase
   */
  abstract destroy(): Promise<void>;

  /**
   * Calculates sha256 digest (hash) of any string and signs it with
   * Hive private key. It's good for verifying keys, in login
   * procedure for instance. However it's bad for signing Hive
   * transactions – these need different hashing method and other
   * special treatment.
   *
   * @abstract
   * @param {SignChallenge} {}
   * @returns {Promise<string>}
   * @memberof SignerBase
   */
  abstract signChallenge({}: SignChallenge): Promise<string>;

  /**
   * Signs Hive transaction with Hive private key and returns signature.
   *
   * @abstract
   * @param {SignTransaction} { digest, transaction }
   * @returns {Promise<string>}
   * @memberof SignerBase
   */
  abstract signTransaction({ digest, transaction }: SignTransaction): Promise<string>;

}
