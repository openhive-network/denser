import { LoginType } from '@smart-signer/types/common';
import { KeyType } from '@smart-signer/types/common';
import { StorageType } from '@smart-signer/lib/storage-mixin';
import { THexString, transaction, TTransactionPackType } from '@hiveio/wax';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export interface SignTransaction {
  digest: THexString;
  transaction: transaction;
}

export interface SignChallenge {
  message: string | Buffer;
  password?: string; // private key or password to unlock hbauth key
  translateFn?: (v: string) => string;
}

export interface SignerOptions {
  username: string;
  loginType: LoginType;
  keyType: KeyType;
  apiEndpoint: string;
  storageType: StorageType;
  chainId: string;
  authorityUsername?: string;
}

/**
 * Signs challenges (any strings) or Hive transactions with Hive private
 * keys.
 *
 * @export
 * @abstract
 * @class Signer
 */
export abstract class Signer {
  username: string;
  loginType: LoginType;
  keyType: KeyType;
  apiEndpoint: string;
  storageType: StorageType;
  pack: TTransactionPackType;
  chainId: string;
  authorityUsername?: string;
  constructor(
    { username, loginType, keyType, apiEndpoint, storageType, chainId }: SignerOptions,
    pack: TTransactionPackType
    ) {
    logger.info('Starting Signer constructor with options: %o and pack: %s',
        arguments[0], arguments[1]);
    if (pack) {
      this.pack = pack;
    } else {
      throw new Error('Signer constructor: pack must be non-empty string');
    }
    if (username) {
      this.username = username;
    } else {
      throw new Error('Signer constructor: username must be non-empty string');
    }
    if (loginType) {
      this.loginType = loginType;
    } else {
      throw new Error('Signer constructor: loginType must be non-empty string');
    }
    if (keyType) {
      this.keyType = keyType;
    } else {
      throw new Error('Signer constructor: keyType must be non-empty string');
    }
    if (apiEndpoint) {
      this.apiEndpoint = apiEndpoint;
    } else {
      throw new Error('Signer constructor: apiEndpoint must be non-empty string');
    }
    if (storageType) {
      this.storageType = storageType;
    } else {
      throw new Error('Signer constructor: storageType must be non-empty string');
    }
    if (chainId) {
      this.chainId = chainId;
    } else {
      throw new Error('Signer constructor: chainId must be non-empty string');
    }
  }

  /**
   * Clears all user data in storages and memory, does other things
   * required before destroying auth session.
   *
   * @abstract
   * @returns {Promise<void>}
   * @memberof Signer
   */
  abstract destroy(): Promise<void>;

  /**
   * Calculates sha256 digest (hash) of any string (challenge) and signs
   * it with Hive private key. It's good for verifying private keys, in
   * login procedure for instance. However it's bad for signing Hive
   * transactions, because this needs other hashing method and other
   * special treatment.
   *
   * @abstract
   * @param {SignChallenge} arg
   * @returns {Promise<string>}
   * @memberof Signer
   */
  abstract signChallenge(arg: SignChallenge): Promise<string>;

  /**
   * Signs Hive transaction with Hive private key and returns signature.
   *
   * @abstract
   * @param {SignTransaction} arg
   * @returns {Promise<string>}
   * @memberof Signer
   */
  abstract signTransaction(arg: SignTransaction): Promise<string>;
}
