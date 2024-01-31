import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { SignChallenge } from '@smart-signer/lib/signer';
import { KeyTypes } from '@smart-signer/types/common';
import { SignerHbauth } from '@smart-signer/lib/signer-hbauth';
import { isStorageAvailable } from '@smart-signer/lib/utils';
import { memoryStorage } from '@smart-signer/lib/memory-storage';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

interface SignerWifOptions {
    storageType?: 'localStorage' | 'sessionStorage' | 'memoryStorage';
}
export class SignerWif extends SignerHbauth {

    public storage: Storage;

    constructor ({
        storageType = 'localStorage'
    }: SignerWifOptions = {}) {
        super();
        if (storageType === 'localStorage'
                && isStorageAvailable(storageType)) {
            this.storage = window.localStorage;
        } else if (storageType === 'sessionStorage'
                && isStorageAvailable(storageType)) {
            this.storage = window.sessionStorage;
        } else {
            this.storage = memoryStorage;
        }
    }

    saveKey(wif: string, keyType = KeyTypes.posting) {
        this.storage.setItem(`wif.${keyType}`, wif);
    }

    getKey(keyType = KeyTypes.posting) {
        return this.storage.getItem(`wif.${keyType}`);
    }

    removeKey(keyType = KeyTypes.posting) {
        this.storage.removeItem(`wif.${keyType}`);
    }

    removeAllKeys() {
        for (const k of Object.keys(KeyTypes)) {
            const keyType = k as KeyTypes;
            this.removeKey(KeyTypes[keyType]);
        }
    }

    async destroy() {
        this.removeAllKeys();
    }

    async signChallenge ({
        message,
        username,
        keyType = KeyTypes.posting,
        password = '', // WIF private key,
    }: SignChallenge): Promise<string> {
        try {
            const wif = password ? password : this.getKey(keyType);
            if (!wif) throw new Error('No wif key');
            const privateKey = PrivateKey.fromString(wif);
            const messageHash = cryptoUtils.sha256(message);
            const signature = privateKey.sign(messageHash).toString();
            this.saveKey(wif, keyType);
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
            const wif = password ? password : this.getKey(keyType);
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
