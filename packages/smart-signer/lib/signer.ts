import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { getDynamicGlobalProperties } from '@ui/lib/hive';
import { createWaxFoundation, TBlockHash, createHiveChain, BroadcastTransactionRequest, vote } from '@hive/wax';
import { KeychainKeyTypes } from 'keychain-sdk';
import { KeychainKeyTypesLC } from '@smart-signer/lib/signer-keychain';
import { authService } from '@smart-signer/lib/auth-service';
import { SignerHbauth } from '@smart-signer/lib/signer-hbauth';
import { SignerKeychain } from '@smart-signer/lib/signer-keychain';
import { SignerWif } from '@smart-signer/lib/signer-wif';
import { Signatures } from '@smart-signer/lib/auth/utils';
import { LoginTypes } from '@smart-signer/types/common';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

export class Signer {

    /**
     * Calculates sha256 digest (hash) of any string and signs it with
     * Hive private key. It's good for verifying keys, in login
     * procedure for instance. However it's not good for signing Hive
     * transactions – those need different hashing method and other
     * special treatment.
     *
     * @param {string} message
     * @param {LoginTypes} loginType
     * @param {string} username
     * @param {string} [password='']
     * @param {KeychainKeyTypesLC} [keyType=KeychainKeyTypesLC.posting]
     * @returns {Promise<Signatures>}
     * @memberof Signer
     */
    async signChallenge(
        message: string,
        loginType: LoginTypes,
        username: string,
        password: string = '', // private key or password to unlock hbauth key
        keyType: KeychainKeyTypesLC = KeychainKeyTypesLC.posting
    ): Promise<Signatures> {
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
                const signature = await signer.signChallenge(username, password,
                    message, keyType);
                logger.info('hbauth', { signature });
                signatures.posting = signature;
            } catch (error) {
                throw error;
            }
        } else if (loginType === LoginTypes.wif) {
            const signer = new SignerWif();
            try {
                const signature = await signer.signChallenge(
                    message,
                    username,
                    keyType,
                    password
                    );
                logger.info('password', { signature });
                signatures.posting = signature;
            } catch (error) {
                throw error;
            }
        }

        return signatures;

    }


    // Create Hive transaction for given operation or operations, sign
    // it and broadcast.
    async signTransaction(

        operation: any,

        loginType: LoginTypes,
        username: string,
        password: string = '', // private key or password to unlock hbauth key
        keyType: KeychainKeyTypesLC = KeychainKeyTypesLC.posting
    ): Promise<any> {}

}
