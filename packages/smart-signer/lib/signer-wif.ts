import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { KeychainKeyTypes } from 'keychain-sdk';
import { KeychainKeyTypesLC } from '@smart-signer/lib/signer-keychain';
import { SignChallenge, SignTransaction } from '@smart-signer/lib/signer';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export class SignerWif {

    async signChallenge ({
        message,
        username,
        keyType = KeychainKeyTypes.posting,
        password = '', // WIF private key
    }: SignChallenge) {

        // TODO
        // if (!password) -> get password from storage

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

    async signTransaction({
        operation,
        loginType,
        username,
        keyType = KeychainKeyTypes.posting
    }: SignTransaction): Promise<any> {

        try {
            logger.info('in signTransaction: %o', {
                operation, loginType, username, keyType
            });
            throw new Error('not implemented');
        } catch (error) {
            throw error;
        }
    }

}
