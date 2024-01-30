import { operation } from '@hive/wax';
import { SignerHbauth } from '@smart-signer/lib/signer-hbauth';
import { SignerHiveauth } from '@smart-signer/lib/signer-hiveauth';
import { SignerKeychain } from '@smart-signer/lib/signer-keychain';
import { SignerWif } from '@smart-signer/lib/signer-wif';
import { LoginTypes } from '@smart-signer/types/common';
import { KeyTypes } from '@smart-signer/types/common';

// export * from '@hive/wax'; // TODO Consider this.
export { vote, operation } from '@hive/wax';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export interface BroadcastTransaction {
    operation: operation;
    loginType: LoginTypes;
    username: string;
    keyType?: KeyTypes;
    translateFn?: (v: string) => string;
}

export interface SignChallenge {
    message: string;
    loginType: LoginTypes;
    username: string;
    password?: string; // private key or password to unlock hbauth key
    keyType?: KeyTypes;
    translateFn?: (v: string) => string;
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
     *         '', keyType = KeyTypes.posting
     *     }
     * @returns {Promise<string>}
     * @memberof Signer
     */
    async signChallenge({
        message,
        loginType,
        username,
        password = '', // private key or password to unlock hbauth key
        keyType = KeyTypes.posting,
        translateFn = (v) => v,
    }: SignChallenge): Promise<string> {
        logger.info('in signChallenge %o', { loginType, username, password, keyType, message });
        let signer: Signer;
        if (loginType === LoginTypes.hbauth) {
            signer = new SignerHbauth();
        } else if (loginType === LoginTypes.hiveauth) {
            signer = new SignerHiveauth();
        } else if (loginType === LoginTypes.keychain) {
            signer = new SignerKeychain();
        } else if (loginType === LoginTypes.wif) {
            signer = new SignerWif();
        } else {
            throw new Error('Invalid loginType');
        }
        try {
            const signature = await signer.signChallenge({
                message,
                username,
                keyType,
                password,
                loginType,
                translateFn,
            });
            return signature;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Creates Hive transaction for given operation, signs it and
     * broadcasts it to Hive blockchain.
     *
     * @param {BroadcastTransaction} { operation, loginType, username,
     *         keyType = KeyTypes.posting
     *     }
     * @returns {Promise<any>}
     * @memberof Signer
     */
    async broadcastTransaction({
        operation,
        loginType,
        username,
        keyType = KeyTypes.posting,
        translateFn = (v) => v,
    }: BroadcastTransaction): Promise<any> {
        logger.info('in broadcastTransaction: %o', {
            operation, loginType, username, keyType
        });
        let signer: any;
        if (loginType === LoginTypes.hbauth) {
            signer = new SignerHbauth();
        } else if (loginType === LoginTypes.hiveauth) {
            signer = new SignerHiveauth();
        } else if (loginType === LoginTypes.keychain) {
            signer = new SignerKeychain();
        } else if (loginType === LoginTypes.wif) {
            signer = new SignerWif();
        } else {
            throw new Error('Invalid loginType');
        }
        return signer.broadcastTransaction({
            operation,
            loginType,
            username,
            keyType,
            translateFn,
        });
    }

}
