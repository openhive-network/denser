import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { KeychainKeyTypesLC } from 'hive-keychain-commons';
import { authService } from '@smart-signer/lib/auth-service';
import { signMessage as signMessageKeychain } from '@smart-signer/lib/hive-keychain';
import { Signatures } from '@smart-signer/lib/auth/utils';
import { LoginTypes } from '@smart-signer/types/common';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

export class Signer {

    constructor() {

    }

    async sign(
        message: string,
        loginType: LoginTypes,
        username: string,
        password: string, // private key or password to unlock hbauth key
        keyType: KeychainKeyTypesLC = KeychainKeyTypesLC.posting
    ): Promise<Signatures> {
        logger.info('in sign %o', { loginType, username, password, keyType, message });
        const signatures: Signatures = {};

        if (loginType === LoginTypes.keychain) {
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
        } else if (loginType === LoginTypes.hiveauth) {
            // not implemented
        } else if (loginType === LoginTypes.hbauth) {
            try {
                // await authService.checkAuths(username, 'posting');

                // TODO This digest is good for login only. For other
                // operations we should use Wax.
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
            } catch (error) {
                throw error;
            }
        }

        return signatures;

    }
}
