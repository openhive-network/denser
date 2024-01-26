import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { getDynamicGlobalProperties } from '@ui/lib/hive';
import { createWaxFoundation, TBlockHash, createHiveChain, BroadcastTransactionRequest, vote, operation } from '@hive/wax';
import { authService } from '@smart-signer/lib/auth-service';
import { SignerHbauth } from '@smart-signer/lib/signer-hbauth';
import { SignerKeychain } from '@smart-signer/lib/signer-keychain';
import { SignerWif } from '@smart-signer/lib/signer-wif';
import { Signatures } from '@smart-signer/lib/auth/utils';
import { LoginTypes } from '@smart-signer/types/common';
import { KeyTypes } from '@smart-signer/types/common';

export { vote, operation } from '@hive/wax';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export interface SignTransaction {
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
     * procedure for instance. However it's not good for signing Hive
     * transactions – those need different hashing method and other
     * special treatment.
     *
     * @param {SignChallenge} {
     *         message,
     *         loginType,
     *         username,
     *         password = '', // private key or password to unlock hbauth key
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
                const signature = await signer.signChallenge(
                    message,
                    username,
                    keyType
                    );
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
     * @param {SignTransaction} { operation, loginType, username,
     *         keyType = KeyTypes.posting
     *     }
     * @returns {Promise<any>}
     * @memberof Signer
     */
    async signTransaction({
        operation,
        loginType,
        username,
        keyType = KeyTypes.posting
    }: SignTransaction): Promise<any> {
        logger.info('in signTransaction: %o', {
            operation, loginType, username, keyType
        });
        if (loginType === LoginTypes.hbauth) {
            const signer = new SignerHbauth();
            try {
                signer.signTransaction({
                    operation,
                    loginType,
                    username,
                    keyType,
                });
            } catch (error) {
                throw error;
            }
        } else {
            try {
                throw new Error('not implemented');
            } catch (error) {
                throw error;
            }
        }
    }

}
