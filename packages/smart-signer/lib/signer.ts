import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { getDynamicGlobalProperties } from '@ui/lib/hive';
import { createWaxFoundation, TBlockHash, createHiveChain, BroadcastTransactionRequest } from '@hive/wax';
import { KeychainKeyTypes } from 'keychain-sdk';
import { KeychainKeyTypesLC } from '@smart-signer/lib/hive-keychain';
import { authService } from '@smart-signer/lib/auth-service';
import { signBuffer, signTx } from '@smart-signer/lib/hive-keychain';
import { Signatures } from '@smart-signer/lib/auth/utils';
import { LoginTypes } from '@smart-signer/types/common';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

export class Signer {

    constructor() {

    }

    async createTransaction() {

        //
        // TODO this does not work. Validation error in Wax. Looks like
        // a bug in Wax.
        //
        // const hiveChain = await createHiveChain();
        // const tx = await hiveChain.getTransactionBuilder('+1m');
        // logger.info('bamboo tx', tx.toApi);

        const vote = {
            voter: 'stirlitz',
            author: 'holozing',
            permlink: 'referral-program-is-live',
            weight: 10000
        }

        const dynamicGlobalData = await getDynamicGlobalProperties();
        const wax = await createWaxFoundation();
        const tx = new wax.TransactionBuilder(dynamicGlobalData?.head_block_id as unknown as TBlockHash, '+1m');
        tx.push({ vote });
        logger.info('bamboo tx', tx.toApi());

        const signature = await signTx('stirlitz', JSON.parse(tx.toString()), KeychainKeyTypesLC.posting);

        // const authClient = await authService.getOnlineClient();
        // const signature = await authClient.sign('stirlitz', tx.sigDigest, 'posting');

        logger.info('bamboo signature', signature);

        const transaction = tx.build();
        transaction.signatures.push(signature);
        logger.info('bamboo tx signed', tx.toApi());

        // or you can use tx.sign(signature, currentProfile.posting.key_auths[0] as unknown as string);
        const transactionRequest = new BroadcastTransactionRequest(tx);
        const hiveChain = await createHiveChain();

        const result = await hiveChain.api.network_broadcast_api.broadcast_transaction(transactionRequest);
        logger.info('bamboo result', result);

    }

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
            try {
                const signature = await signBuffer(
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
                logger.info('password', { messageHash: messageHash.toString('hex') });
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
