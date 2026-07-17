import { LoginType } from '@smart-signer/types/common';
import { KeyType } from '@smart-signer/types/common';
import { StorageType } from '@smart-signer/lib/storage-mixin';
import { THexString, TPublicKey, transaction, TTransactionPackType } from '@hiveio/wax';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export interface SignTransaction {
  digest: THexString;
  transaction: transaction;
  // if singleSign is defined, this is required
  // so we need to get the private key from the user
  singleSignKeyType?: 'owner' | 'active' | 'posting';
  requiredKeyType?: 'owner' | 'active' | 'posting';
}
export interface SignChallenge {
  message: string | ArrayBufferView | ArrayBuffer;
  password?: string; // private key or password to unlock hbauth key
  translateFn?: (v: string) => string;
}

export interface EncryptMemo {
  toAccount: string;
  toAccountMemoPublicKey: TPublicKey;
  memo: string;
}

export interface SignerOptions {
  username: string;
  loginType: LoginType;
  keyType: KeyType;
  storageType: StorageType;
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
  storageType: StorageType;
  pack: TTransactionPackType;
  authorityUsername?: string;
  constructor(
    { username, loginType, keyType, storageType }: SignerOptions,
    pack: TTransactionPackType
  ) {
    logger.info('Starting Signer constructor with options: %o and pack: %s', arguments[0], arguments[1]);
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
    if (storageType) {
      this.storageType = storageType;
    } else {
      throw new Error('Signer constructor: storageType must be non-empty string');
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

  /**
   * Encrypts a memo for `toAccount` using this signer's own key-holding
   * mechanism (e.g. the Keychain/Peak Vault browser extension). Not every
   * login type can hold/use a MEMO key this way (hb-auth's key store only
   * knows active/posting/owner, and HiveAuth's remote relay flow has no
   * local key material at all) - those throw here by design; callers should
   * fall back to prompting for a raw MEMO private key instead
   * (`@smart-signer/lib/memo-crypto`'s `encryptMemoWithPrivateKey`).
   *
   * @param {EncryptMemo} _arg
   * @returns {Promise<string>}
   * @memberof Signer
   */
  async encryptData(_arg: EncryptMemo): Promise<string> {
    throw new Error(`MEMO encryption is not supported for login type "${this.loginType}"`);
  }

  /**
   * Decrypts a `#`-prefixed encrypted memo using this signer's own
   * key-holding mechanism. See `encryptData` above for which login types
   * support this.
   *
   * @param {string} _encodedMemo
   * @returns {Promise<string>}
   * @memberof Signer
   */
  async decryptData(_encodedMemo: string): Promise<string> {
    throw new Error(`MEMO decryption is not supported for login type "${this.loginType}"`);
  }
}
