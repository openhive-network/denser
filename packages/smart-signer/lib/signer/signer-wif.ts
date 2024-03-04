import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { SignChallenge } from '@smart-signer/lib/signer/signer';
import { KeyType } from '@smart-signer/types/common';
import { SignerHbauth } from '@smart-signer/lib/signer/signer-hbauth';
import { StorageMixin } from '@smart-signer/lib/storage-mixin';
import { createHiveChain, IHiveChainInterface } from '@hive/wax';

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
  async destroy() {
    for (const k of Object.keys(KeyType)) {
      const keyType = k as KeyType;
      this.storage.removeItem(`wif.${this.username}@${KeyType[keyType]}`);
    }
  }

  async verifyPrivateKey(wif: string) {
    const privateKey = PrivateKey.fromString(wif);
    const publicKey = privateKey.createPublic('STM');
    const hiveChain: IHiveChainInterface = await createHiveChain();
    const referencedAccounts = (await hiveChain.api.account_by_key_api.get_key_references({ keys: [publicKey.toString()] })).accounts;
    logger.info('referencedAccounts: %o', referencedAccounts);
    if (referencedAccounts[0].includes(this.username)) {
      return true;
    }
    return false;
  }

  async signChallenge({
    message,
    password = '' // WIF private key,
  }: SignChallenge): Promise<string> {
    const { username, keyType } = this;
    try {
      let wif = password ? password : this.storage.getItem(`wif.${username}@${keyType}`);
      if (!wif) {
        wif = await this.getPasswordFromUser({
          i18nKeyPlaceholder: 'login_form.posting_private_key_placeholder'
        });
      }
      if (!wif) throw new Error('No WIF key');
      // We don't know, if this WIF is correct, so we need to verify it.
      if (await this.verifyPrivateKey(wif)) {
        // TODO Ask user if he wants to store this key.
        this.storage.setItem(`wif.${username}@${keyType}`, wif);
      } else {
        throw new Error('Invalid WIF key');
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

  async signDigest(digest: string, password: string) {
    const { username, keyType } = this;
    const args = { username, password, digest, keyType };
    logger.info('signDigest args: %o', args);
    let signature = '';
    try {
      let wif = password ? password : this.storage.getItem(`wif.${username}@${keyType}`);
      if (!wif) {
        wif = await this.getPasswordFromUser({
          i18nKeyPlaceholder: 'login_form.posting_private_key_placeholder',
          i18nKeyTitle: 'login_form.title_wif_dialog_password'
        });
      }
      if (!wif) throw new Error('No wif key');

      const privateKey = PrivateKey.fromString(wif);
      const hash = Buffer.from(digest, 'hex');
      signature = privateKey.sign(hash).toString();
    } catch (error) {
      throw error;
    }
    return signature;
  }
}
