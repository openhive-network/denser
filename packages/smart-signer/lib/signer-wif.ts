import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { SignChallenge } from '@smart-signer/lib/signer';
import { KeyTypes } from '@smart-signer/types/common';
import { SignerHbauth } from '@smart-signer/lib/signer-hbauth';
import { StorageMixin } from '@smart-signer/lib/storage-mixin';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

/**
 * Instance interacts with Hive private keys, signs messages or
 * operations, and sends operations to Hive blockchain. It uses So known
 * "Wif" custom tool, based on
 * [@hiveio/dhive](https://openhive-network.github.io/dhive/) and
 * Web Storage API.
 *
 * @export
 * @class SignerWif
 * @extends {StorageMixin(SignerBase)}
 */
export class SignerWif extends StorageMixin(SignerHbauth) {

    async destroy(username: string) {
        for (const k of Object.keys(KeyTypes)) {
            const keyType = k as KeyTypes;
            this.storage.removeItem(`wif.${username}@${KeyTypes[keyType]}`);
        }
    }

    async signChallenge ({
        message,
        username,
        keyType = KeyTypes.posting,
        password = '', // WIF private key,
    }: SignChallenge): Promise<string> {
        try {
            let wif = password ? password
                : this.storage.getItem(`wif.${username}@${keyType}`);
            if (!wif) {
                wif = await this.getPasswordFromUser({
                    placeholderKeyI18n: 'login_form.posting_private_key',
                });
            }
            if (!wif) throw new Error('No wif key');

            const privateKey = PrivateKey.fromString(wif);
            const messageHash = cryptoUtils.sha256(message);
            const signature = privateKey.sign(messageHash).toString();
            this.storage.setItem(`wif.${username}@${keyType}`, wif);
            logger.info('wif', { signature });
            return signature;
        } catch (error) {
            throw error;
        }
    };

    async signDigest(
        digest: string,
        username: string,
        password: string,
        keyType: KeyTypes = KeyTypes.posting
    ) {
        const args = { username, password, digest, keyType };
        logger.info('signDigest args: %o', args);
        let signature = ''
        try {
            let wif = password ? password
                : this.storage.getItem(`wif.${username}@${keyType}`);
            if (!wif) {
                wif = await this.getPasswordFromUser({
                    placeholderKeyI18n: 'login_form.posting_private_key_placeholder',
                    titleKeyI18n: 'login_form.title_wif_dialog_password',
                });
                // TODO Should we store this key now?
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
