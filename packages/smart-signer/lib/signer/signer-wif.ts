import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { SignChallenge, SignerOptions } from '@smart-signer/lib/signer/signer';
import { KeyType } from '@smart-signer/types/common';
import { SignerHbauth } from '@smart-signer/lib/signer/signer-hbauth';
import { StorageMixin } from '@smart-signer/lib/storage-mixin';
import { TTransactionPackType, THexString } from '@hive/wax';
import { verifyPrivateKey } from '@smart-signer/lib/utils';
import { DialogWifModalPromise } from '@smart-signer/components/dialog-wif';

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
    const { username, keyType } = this;
    let storeKey: boolean = false;
    try {
      const storedWif = this.storage.getItem(`wif.${username}@${keyType}`);
      let wif = storedWif ? JSON.parse(storedWif) : password;
      if (!wif) {
        wif = await this.getPasswordFromUser({
          i18nKeyPlaceholder: ['login_form.private_key_placeholder', {keyType}],
          i18nKeyTitle: ['login_form.title_wif_dialog_password']
        });
        // TODO Ask user if he wants to store the key. If he answers
        // "yes", verify the key before storing it. Another option: return
        // callback to store key after successful login.
        storeKey = true;
      }
      if (!wif) throw new Error('No WIF key');


      if (storeKey) {
        // We don't know, if this key is correct, so we need to verify
        // it. We don't want to store incorrect key.
        if (await verifyPrivateKey(this.username, wif, this.keyType, this.apiEndpoint)) {
          this.storage.setItem(`wif.${username}@${keyType}`, JSON.stringify(wif));
        } else {
          throw new Error('Invalid WIF key');
        }
      }

      const privateKey = PrivateKey.fromString(wif);
      const digestBuf = cryptoUtils.sha256(message);
      const signature = privateKey.sign(digestBuf).toString();
      logger.info('wif', { signature, digest: digestBuf.toString('hex') });
      return signature;
    } catch (error) {
      throw error;
    }
  }

  async signDigest(digest: THexString, password: string) {
    const { username, keyType } = this;
    const args = { username, password, digest, keyType };
    logger.info('signDigest args: %o', args);
    try {
      let wif = password ?
          password
          : JSON.parse(this.storage.getItem(`wif.${username}@${keyType}`) || '""');
      if (!wif) {
        wif = await this.getPasswordFromUser({
          i18nKeyPlaceholder: ['login_form.private_key_placeholder', {keyType}],
          i18nKeyTitle: ['login_form.title_wif_dialog_password', {}]
        });
      }
      if (!wif) throw new Error('No wif key');

      // TODO Ask user if he wants to store the key. If he answers
      // "yes", verify the key and store it. Another option: return
      // callback to store key after successful login.
      const storeKey: boolean = true;

      if (storeKey) {
        // We don't know, if this key is correct, so we need to verify
        // it. We don't want to store incorrect key.
        if (await verifyPrivateKey(this.username, wif, this.keyType, this.apiEndpoint)) {
          this.storage.setItem(`wif.${username}@${keyType}`, JSON.stringify(wif));
        } else {
          throw new Error('Invalid WIF key');
        }
      }

      const privateKey = PrivateKey.fromString(wif);
      const hash = Buffer.from(digest, 'hex');
      const signature = privateKey.sign(hash).toString();
      return signature;
    } catch (error) {
      throw error;
    }
  }

  async getPasswordFromUser(dialogProps: { [key: string]: any } = {}): Promise<string> {
    let password = '';
    try {
      const result = await DialogWifModalPromise({
        isOpen: true,
        ...dialogProps
      });
      password = result as string;
      logger.info('Return from PasswordModalPromise: %s', result);
      return password;
    } catch (error) {
      logger.error('Return from PasswordModalPromise %s', error);
      throw new Error('No password from user');
    }
  }

}
