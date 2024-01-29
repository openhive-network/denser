import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { SignChallenge, BroadcastTransaction } from '@smart-signer/lib/signer';
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
        if (isStorageAvailable(storageType)) {
            if (storageType = 'localStorage') {
                this.storage = window.localStorage;
            } else if (storageType = 'sessionStorage') {
                this.storage = window.sessionStorage;
            } else {
                this.storage = memoryStorage;
            }
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
        for (const keyType of Object.keys(KeyTypes)) {
            this.removeKey(keyType);
        }
    }

    async signChallenge ({
        message,
        username,
        keyType = KeyTypes.posting,
        password = '', // WIF private key
    }: SignChallenge) {
        let signature = ''
        try {
            const wif = password ? password : this.getKey(keyType);
            if (!wif) throw new Error('No wif key');
            const privateKey = PrivateKey.fromString(wif);
            const messageHash = cryptoUtils.sha256(message);
            logger.info('wif', { messageHash: messageHash.toString('hex') });
            signature = privateKey.sign(messageHash).toString();
            this.saveKey(wif, keyType);
        } catch (error) {
            throw error;
        }
        return signature;
    };

    async signDigest(
        digest: string,
        username: string,
        password: string,
        keyType: KeyTypes = KeyTypes.posting
    ) {
        logger.info('sign args: %o', { username, password, digest, keyType });
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
