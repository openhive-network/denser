import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { SignChallenge } from '@smart-signer/lib/signer';
import { KeyTypes } from '@smart-signer/types/common';
import { SignerHbauth } from '@smart-signer/lib/signer-hbauth';
import { StorageMixin } from '@smart-signer/lib/storage-mixin';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

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
            const wif = password ? password
                : this.storage.getItem(`wif.${username}@${keyType}`);
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
            const wif = password ? password
                : this.storage.getItem(`wif.${username}@${keyType}`);
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
