import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { KeychainKeyTypesLC } from 'hive-keychain-commons';
import { authService } from '@smart-signer/lib/auth-service';
import { signMessage as signMessageKeychain } from '@smart-signer/lib/hive-keychain';
import { Signatures } from '@smart-signer/lib/auth/utils';
import HiveAuthUtils from '@smart-signer/lib/hive-auth-utils';
import { LoginTypes } from '@smart-signer/types/common';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

export class Signer {

    constructor() {

    }

    async signKeychain(
        message: string,
        username: string,
        keyType: KeychainKeyTypesLC = KeychainKeyTypesLC.posting
    ) {
        const signatures: Signatures = {};
        try {
            const signature = await signMessageKeychain(
                message,
                username,
                keyType
                );
            logger.info('keychain', { signature });
            signatures.posting = signature;
        } catch (error) {
            throw error;
        }
        return signatures;
    }

    async sign(
        message: string,
        loginType: LoginTypes,
        username: string,
        password: string, // posting private key or password to unlock hbauth key
        keyType: KeychainKeyTypesLC = KeychainKeyTypesLC.posting,
        hiveAuthData: any,
        setHiveAuthData: any,
        t: any,
        hiveKeys: any,
        setHiveKeys: any
    ): Promise<Signatures> {
        logger.info('in sign %o', { loginType, username, password, keyType, message });
        const signatures: Signatures = {};

        if (loginType === LoginTypes.keychain) {
            return this.signKeychain(
                message,
                username,
                keyType
            );
        } else if (loginType === LoginTypes.hiveauth) {
            try {
                HiveAuthUtils.setUsername(hiveAuthData?.username || '');
                HiveAuthUtils.setToken(hiveAuthData?.token || '');
                HiveAuthUtils.setExpire(hiveAuthData?.expire || 0);
                HiveAuthUtils.setKey(hiveAuthData?.key || '');

                const authResponse: any = await new Promise((resolve) => {
                    HiveAuthUtils.login(
                        username,
                        message,
                        (res) => {
                            resolve(res);
                        },
                        t
                    );
                });

                if (authResponse.success && authResponse.hiveAuthData) {
                    const { token, expire, key, challengeHex } = authResponse.hiveAuthData;
                    setHiveAuthData({ username, token, expire, key });
                    logger.info('hiveauth', { signature: challengeHex });
                    signatures.posting = challengeHex;
                } else {
                    throw new Error('Hiveauth login failed');
                }
            } catch (error) {
                throw error;
            }
        } else if (loginType === LoginTypes.hbauth) {
            try {
                // await authService.checkAuths(username, 'posting');
                const digest = cryptoUtils.sha256(message).toString('hex');
                const signature = await authService.sign(username, password,
                    digest, keyType);
                logger.info('hbauth', { signature });
                signatures.posting = signature;
            } catch (error) {
                throw error;
            }
        } else if (loginType === LoginTypes.password) {
            try {
                const privateKey = PrivateKey.fromString(password);
                const messageHash = cryptoUtils.sha256(message);
                const signature = privateKey.sign(messageHash).toString();
                logger.info('password', { signature });
                signatures.posting = signature;
                setHiveKeys({ ...hiveKeys, ...{ posting: password } });
            } catch (error) {
                throw error;
            }
        }

        return signatures;

    }
}
