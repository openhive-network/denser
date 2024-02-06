import { KeyTypes } from '@smart-signer/types/common';
import { cryptoUtils } from '@hiveio/dhive';
import { authService } from '@smart-signer/lib/auth-service';
import { SignChallenge, BroadcastTransaction } from '@smart-signer/lib/signer';
import { createHiveChain, BroadcastTransactionRequest } from '@hive/wax/web';
import { SignerBase } from '@smart-signer/lib/signer-base';
import { DialogHbauthPasswordModalPromise } from '@smart-signer/components/dialog-hbauth-password';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

/**
 * Instance interacts with Hive private keys, signs messages or
 * operations, and sends operations to Hive blockchain. It uses
 * [Hbauth](https://gitlab.syncad.com/hive/hb-auth).
 *
 * @export
 * @class SignerHbauth
 * @extends {SignerBase}
 */
export class SignerHbauth extends SignerBase {

  async getPasswordFromUser(): Promise<string> {
    let password = '';
    try {
      const result = await DialogHbauthPasswordModalPromise({
        isOpen: true,
      });
      password = result as string;
      logger.info('Return from DialogHbauthPasswordModalPromise: %s', result);
      return password;
    } catch (error) {
      logger.error('Return from DialogHbauthPasswordModalPromise %s', error);
      throw new Error('No password to unlock wallet');
    }
  }

  // Create digest and return its signature made with signDigest.
  async signChallenge({
    username,
    password = '',
    message,
    keyType = KeyTypes.posting
  }: SignChallenge): Promise<string> {
    const digest = cryptoUtils.sha256(message).toString('hex');
    const signature = this.signDigest(digest, username, password, keyType);
    logger.info('hbauth', { signature });
    return signature;
  }

  async broadcastTransaction({
    operation,
    username,
    keyType = KeyTypes.posting
  }: BroadcastTransaction): Promise<{ success: boolean; result: string; error: string }> {
    let result = { success: true, result: '', error: '' };
    try {
      const hiveChain = await createHiveChain({ apiEndpoint: this.apiEndpoint });
      const tx = await hiveChain.getTransactionBuilder();
      tx.push(operation).validate();
      const signature = await this.signDigest(tx.sigDigest, username, '', keyType);
      const transaction = tx.build();
      transaction.signatures.push(signature);
      const transactionRequest = new BroadcastTransactionRequest(tx);
      await hiveChain.api.network_broadcast_api.broadcast_transaction(transactionRequest);
    } catch (error) {
      logger.error('SignerHbauth.broadcastTransaction error: %o', error);
      result = { success: false, result: '', error: 'Broadcast failed' };
      throw error;
    }

    return result;
  }

  async signDigest(digest: string, username: string, password: string, keyType: KeyTypes = KeyTypes.posting) {
    logger.info('sign args: %o', { username, password, digest, keyType });

    const authClient = await authService.getOnlineClient();
    const auth = await authClient.getAuthByUser(username);
    logger.info('auth: %o', auth);

    if (!auth) {
      throw new Error(`No auth for username ${username}`);
    }

    if (!auth.authorized) {
      if (!['posting', 'active'].includes(keyType)) {
        throw new Error(`Unsupported keyType: ${keyType}`);
      }

      if (!password) {
        password = await this.getPasswordFromUser();
      }

      const authStatus = await authClient.authenticate(
        username,
        password,
        keyType as unknown as 'posting' | 'active'
      );

      logger.info('authStatus', { authStatus });
      if (!authStatus.ok) {
        throw new Error(`Unlocking wallet failed`);
      }
    }

    if (!['posting', 'active'].includes(keyType)) {
      throw new Error(`Unsupported keyType: ${keyType}`);
    }

    const signature = await authClient.sign(username, digest, keyType as unknown as 'posting' | 'active');
    logger.info('hbauth: %o', { digest, signature });

    return signature;
  }

  async checkAuths(username: string, keyType: string) {
    const authClient = await authService.getOnlineClient();
    const auths = await authClient.getAuths();
    logger.info('auths: %o', auths);
    // await authClient.logout();
    const auth = auths.find((auth) => auth.username === username);
    if (auth) {
      logger.info('Found auth: %o', auth);
      if (auth.authorized) {
        if (auth.keyType === keyType) {
          logger.info('User is authorized and we are ready to proceed');
          // We're ready to sign loginChallenge and proceed.
        } else {
          logger.info('User is authorized, but with incorrect keyType: %s', auth.keyType);
        }
      } else {
        logger.info('User is not authorized');
        // We should tell to unlock wallet (login to wallet).
      }
    } else {
      logger.info('Auth for user not found: %s', username);
      // We should offer adding account to wallet.
    }
  }

}
