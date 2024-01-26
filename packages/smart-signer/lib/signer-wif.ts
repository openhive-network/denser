import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { SignChallenge, BroadcastOperation } from '@smart-signer/lib/signer';
import { KeyTypes } from '@smart-signer/types/common';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export class SignerWif {

    async signChallenge ({
        message,
        username,
        keyType = KeyTypes.posting,
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

    async broadcastOperation({
        operation,
        loginType,
        username,
        keyType = KeyTypes.posting
    }: BroadcastOperation): Promise<any> {

        try {
            logger.info('in broadcastOperation: %o', {
                operation, loginType, username, keyType
            });
            throw new Error('not implemented');
        } catch (error) {
            throw error;
        }
    }

}
