import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { SignChallenge, SignerOptions } from '@smart-signer/lib/signer/signer';
import { KeyType } from '@smart-signer/types/common';
import { SignerHbauth } from '@smart-signer/lib/signer/signer-hbauth';
import { StorageMixin } from '@smart-signer/lib/storage-mixin';
import { TTransactionPackType, THexString } from '@hive/wax';
import { verifyPrivateKey } from '@smart-signer/lib/utils';
import { DialogWifModalPromise } from '@smart-signer/components/dialog-wif';
import { PasswordFormOptions } from '@smart-signer/components/password-form';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

/**
 * Signs challenges (any strings) or Hive transactions with Hive private
 * keys, using so known "Wif" custom tool, based on
 * [@hiveio/dhive](https://openhive-network.github.io/dhive/) and Web
 * Storage API.
 *
 * @export
 * @class SignerWif
 * @extends {StorageMixin(Signer)}
 */
export class SignerWif extends StorageMixin(SignerHbauth) {

  constructor(
    signerOptions: SignerOptions,
    pack: TTransactionPackType = TTransactionPackType.HF_26
    ) {
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
    return this.signDigest(digest, password)
  }

  async signDigest(digest: THexString | Buffer, password: string) {
    const { username, keyType } = this;
    const args = { username, password, digest, keyType };
    logger.info('signDigest args: %o', args);
    try {
      // Resolve WIF key
      let wif = password ?
          password
          : JSON.parse(this.storage.getItem(`wif.${username}@${keyType}`) || '""');
      if (!wif) {
        wif = await this.getPasswordFromUser();
      }
      if (!wif) throw new Error('No WIF key');

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

  async getPasswordFromUser(): Promise<any> {
    const { username, keyType, apiEndpoint } = this;
    const passwordFormOptions: PasswordFormOptions = {
      mode: "wif",
      showInputStorePassword: true,
      i18nKeysForCaptions: {
        inputPasswordPlaceholder: [
          'login_form.private_key_placeholder',
          {keyType}
        ],
        inputStorePasswordLabel: 'password_form.store_key_label',
        title: 'login_form.title_wif_dialog_password',
      },
    };

    try {
      const {
        password: wif,
        storePassword: storeKey
      } = await DialogWifModalPromise({
        isOpen: true,
        passwordFormOptions
      });

      if (storeKey) {
        // We must verify key before storing it.
        if (await verifyPrivateKey(
            username, wif, keyType, apiEndpoint
            )) {
          this.storage.setItem(
            `wif.${username}@${keyType}`,
            JSON.stringify(wif)
            );
        } else {
          throw new Error('Invalid WIF key from user');
        }
      }

      return wif;
    } catch (error) {
      logger.error('Error in getPasswordFromUser %o', error);
      throw new Error('No WIF key from user');
    }
  }

}
