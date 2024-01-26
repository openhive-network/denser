import { operation } from '@hive/wax';
import { SignerHbauth } from '@smart-signer/lib/signer-hbauth';
import { SignerKeychain } from '@smart-signer/lib/signer-keychain';
import { SignerWif } from '@smart-signer/lib/signer-wif';
import { Signatures } from '@smart-signer/lib/auth/utils';
import { LoginTypes } from '@smart-signer/types/common';
import { KeyTypes } from '@smart-signer/types/common';
export { vote, operation } from '@hive/wax';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export interface BroadcastOperation {
    operation: operation;
    loginType: LoginTypes;
    username: string;
    keyType?: KeyTypes
}

export interface SignChallenge {
    message: string;
    loginType: LoginTypes;
    username: string;
    password?: string; // private key or password to unlock hbauth key
    keyType?: KeyTypes;
}

export class Signer {

    /**
     * Calculates sha256 digest (hash) of any string and signs it with
     * Hive private key. It's good for verifying keys, in login
     * procedure for instance. However it's bad for signing Hive
     * transactions – these need different hashing method and other
     * special treatment.
     *
     * @param {SignChallenge} { message, loginType, username, password =
     *         '', // private key or password to unlock hbauth key
     *         keyType = KeyTypes.posting
     *     }
     * @returns {Promise<Signatures>}
     * @memberof Signer
     */
    async signChallenge({
        message,
        loginType,
        username,
        password = '', // private key or password to unlock hbauth key
        keyType = KeyTypes.posting
    }: SignChallenge): Promise<Signatures> {
        logger.info('in signChallenge %o', { loginType, username, password, keyType, message });
        const signatures: Signatures = {};

        if (loginType === LoginTypes.keychain) {
            const signer = new SignerKeychain();
            try {
                const signature = await signer.signChallenge({
                    username,
                    password,
                    message,
                    keyType,
                    loginType,
                });
                logger.info('keychain', { signature });
                signatures.posting = signature;
            } catch (error) {
                throw error;
            }
        } else if (loginType === LoginTypes.hiveauth) {
            // not implemented
        } else if (loginType === LoginTypes.hbauth) {
            const signer = new SignerHbauth();
            try {
                // await signer.checkAuths(username, 'posting');
                const signature = await signer.signChallenge({
                    username,
                    password,
                    message,
                    keyType,
                    loginType,
                });
                logger.info('hbauth', { signature });
                signatures.posting = signature;
            } catch (error) {
                throw error;
            }
        } else if (loginType === LoginTypes.wif) {
            const signer = new SignerWif();
            try {
                const signature = await signer.signChallenge({
                    message,
                    username,
                    keyType,
                    password,
                    loginType,
                });
                logger.info('password', { signature });
                signatures.posting = signature;
            } catch (error) {
                throw error;
            }
        }

        return signatures;

    }

    /**
     * Create Hive transaction for given operation or operations, sign
     * it and broadcast.
     *
     * @param {BroadcastOperation} {
     *         operation,
     *         loginType,
     *         username,
     *         keyType = KeyTypes.posting
     *     }
     * @returns {Promise<any>}
     * @memberof Signer
     */
    async broadcastOperation({
        operation,
        loginType,
        username,
        keyType = KeyTypes.posting
    }: BroadcastOperation): Promise<any> {
        logger.info('in broadcastOperation: %o', {
            operation, loginType, username, keyType
        });
        if (loginType === LoginTypes.hbauth) {
            const signer = new SignerHbauth();
            return signer.broadcastOperation({
                operation,
                loginType,
                username,
                keyType,
            });
        } else if (loginType === LoginTypes.keychain) {
            const signer = new SignerKeychain();
            return signer.broadcastOperation({
                operation,
                loginType,
                username,
                keyType,
            });
        } else {
            throw new Error('not implemented');
        }
    }

}
