import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { KeychainKeyTypes } from 'keychain-sdk';
import { KeychainKeyTypesLC } from '@smart-signer/lib/signer-keychain';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

export class SignerWif {
    async signChallenge (
        message: string,
        username: string,
        method: KeychainKeyTypes = KeychainKeyTypes.posting,
        password: string, // WIF private key
    ) {
        let signature = ''
        try {
            const privateKey = PrivateKey.fromString(password);
            const messageHash = cryptoUtils.sha256(message);
            logger.info('password', { messageHash: messageHash.toString('hex') });
            signature = privateKey.sign(messageHash).toString();
        } catch (error) {
            throw error;
        }
        return signature;
    };
}
