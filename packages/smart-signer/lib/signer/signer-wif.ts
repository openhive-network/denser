import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { SignChallenge, SignerOptions } from '@smart-signer/lib/signer/signer';
import { KeyType } from '@smart-signer/types/common';
import { SignerHbauth } from '@smart-signer/lib/signer/signer-hbauth';
import { StorageMixin } from '@smart-signer/lib/storage-mixin';
import { TTransactionPackType, THexString } from '@hiveio/wax';
import { verifyPrivateKey } from '@smart-signer/lib/utils';
import { PasswordDialogModalPromise } from '@smart-signer/components/password-dialog';
import { PasswordFormMode, PasswordFormOptions } from '@smart-signer/components/password-form';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

/**
 * Signs challenges (any strings or byte arrays) or Hive transactions
 * with Hive private keys, using so known "Wif" custom tool, based on
 * [@hiveio/dhive](https://openhive-network.github.io/dhive/) and Web
 * Storage API.
 *
 * @export
 * @class SignerWif
 * @extends {StorageMixin(Signer)}
 */
export class SignerWif extends StorageMixin(SignerHbauth) {
  constructor(signerOptions: SignerOptions, pack: TTransactionPackType = TTransactionPackType.HF_26) {
    super(signerOptions, pack);
  }

  async destroy() {
    for (const k of Object.keys(KeyType)) {
      const keyType = k as KeyType;
      this.storage.removeItem(`wif.${this.username}@${KeyType[keyType]}`);
    }
  }

  async signChallenge({
    message,
    password = '' // WIF private key,
  }: SignChallenge): Promise<string> {
    const digest: Buffer = cryptoUtils.sha256(message);
    return this.signDigest(digest, password);
  }

  async signDigest(digest: THexString | Buffer, password: string) {
    const { username, keyType } = this;
    const args = { username, password, digest, keyType };
    logger.info('signDigest args: %o', args);
    try {
      // Resolve WIF key
      let wif = password ? password : JSON.parse(this.storage.getItem(`wif.${username}@${keyType}`) || '""');
      if (!wif) {
        wif = await this.getPasswordFromUser();
      }
      if (!wif) throw new Error('login_form.zod_error.no_wif_key');

      // Convert digest to Buffer, if it is string.
      if (typeof digest === 'string') {
        digest = Buffer.from(digest, 'hex');
      }

      // Sign digest
      const privateKey = PrivateKey.fromString(wif);
      const signature = privateKey.sign(digest).toString();

      return signature;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Displays dialog and asks user to enter password (WIF key). Also
   * triggers storing this password, if user wants this.
   *
   * @returns {Promise<string>}
   * @memberof SignerWif
   */
  async getPasswordFromUser(): Promise<string> {
    const { keyType } = this;
    const passwordFormOptions: PasswordFormOptions = {
      mode: PasswordFormMode.WIF,
      showInputStorePassword: true,
      i18nKeysForCaptions: {
        inputPasswordPlaceholder: ['login_form.private_key_placeholder', { keyType }],
        inputStorePasswordLabel: 'password_form.store_key_label',
        title: 'login_form.title_wif_dialog_password'
      }
    };

    try {
      if (!this.passwordPromise) {
        const resolvePassword = async () => {
          const { password: wif, storePassword: storeKey } = await PasswordDialogModalPromise({
            isOpen: true,
            passwordFormOptions
          });
          if (storeKey) {
            await this.storePassword(wif);
          }
          return wif;
        };
        this.passwordPromise = resolvePassword();
      }
      const wif: string = await this.passwordPromise;
      return wif;
    } catch (error) {
      logger.error('Error in getPasswordFromUser: %o', error);
      throw new Error('No WIF key from user');
    }
  }

  /**
   * Stores password (WIF key) in storage for future use.
   *
   * @param {''} wif
   * @memberof SignerWif
   */
  async storePassword(wif: '') {
    const { username, keyType, apiEndpoint } = this;
    const storageKey = `wif.${username}@${keyType}`;

    // Check if we have the same key already stored (means also already
    // verified).
    const wifInStorage = this.storage.getItem(storageKey);
    if (wifInStorage) {
      logger.info('Found key in storage under key: %s', storageKey);
      if (JSON.parse(wifInStorage) === wif) {
        logger.info('Wif is already stored under key: %s', storageKey);
        return;
      } else {
        logger.info('Stored wif is different');
      }
    } else {
      logger.info('No wif in storage under key: %s', storageKey);
    }

    // Verify key before storing it.
    logger.info('Starting to verify wif');
    let valid = false;
    try {
      valid = await verifyPrivateKey(username, wif, keyType, apiEndpoint);
    } catch (error) {
      logger.error('Cannot verify private key: %o', error);
      throw error;
    }

    // Throw error if key is invalid.
    if (!valid) {
      throw new Error('login_form.zod_error.invalid_wif');
    }

    // Store key if it is valid.
    this.storage.setItem(storageKey, JSON.stringify(wif));

    logger.info('Stored valid wif under key: %s', storageKey);
  }
}
