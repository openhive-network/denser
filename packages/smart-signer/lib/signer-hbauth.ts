import { KeyTypes } from '@smart-signer/types/common';
import { cryptoUtils } from '@hiveio/dhive';
import { authService } from '@smart-signer/lib/auth-service';
import { createHiveChain, BroadcastTransactionRequest, THexString } from '@hive/wax/web';
import { SignChallenge, BroadcastTransaction, SignTransaction, SignerBase } from '@smart-signer/lib/signer-base';
import { DialogPasswordModalPromise } from '@smart-signer/components/dialog-password';
import { createWaxFoundation, operation, ITransactionBuilder } from '@hive/wax/web';

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

  async getPasswordFromUser(dialogProps: { [key: string]: any } = {}): Promise<string> {
    let password = '';
    try {
      const result = await DialogPasswordModalPromise({
        isOpen: true,
        ...dialogProps,
      });
      password = result as string;
      logger.info('Return from PasswordModalPromise: %s', result);
      return password;
    } catch (error) {
      logger.error('Return from PasswordModalPromise %s', error);
      throw new Error('No password from user');
    }
  }

  // Create digest and return its signature made with signDigest.
  async signChallenge({
    password = '',
    message,
  }: SignChallenge): Promise<string> {
    const { username, keyType } = this;
    const digest = cryptoUtils.sha256(message).toString('hex');

    await this.checkAuths(username, keyType);

    const signature = await this.signDigest(digest, password);
    logger.info('hbauth', { signature });
    return signature;
  }

  async createTransaction({ operation }: BroadcastTransaction) {
    const { apiEndpoint } = this;
    try {
      const hiveChain = await createHiveChain({ apiEndpoint });
      const tx = await hiveChain.getTransactionBuilder();
      tx.push(operation).validate();
      const result = { txApiString: tx.toApi(), txSigDigest: tx.sigDigest }
      logger.info('createTransaction result: %o', result);
      return result;
    } catch (error) {
      logger.error('SignerHbauth.createTransaction error: %o', error);
      throw error;
    }
  }

  async broadcastTransaction({
    operation,
  }: BroadcastTransaction): Promise<{ success: boolean; result: string; error: string }> {
    let result = { success: true, result: '', error: '' };
    const { apiEndpoint } = this;
    try {
      const hiveChain = await createHiveChain({ apiEndpoint });
      const tx = await hiveChain.getTransactionBuilder();
      tx.push(operation).validate();
      const signature = await this.signDigest(tx.sigDigest, '');
      const transaction = tx.build();
      logger.info('SignerHbauth.broadcastTransaction tx: %o', tx.toApi());
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


  async signTransaction({ txSigDigest, txApiString }: SignTransaction) {
    const wax = await createWaxFoundation();
    let tx: ITransactionBuilder;

    // tx = new wax.TransactionBuilder(JSON.parse(txApiString));
    tx = wax.TransactionBuilder.fromApi(txApiString);
    logger.info('signTransaction digests: %o', {txSigDigest, 'tx.sigDigest': tx.sigDigest})
    if (txSigDigest !== tx.sigDigest) throw new Error('Digests do not match');

    // Show txApiString to user and get his consent to sign it.

    return this.signDigest(txSigDigest, '');
  }


  async signDigest(digest: THexString, password: string) {
    const { username, keyType } = this;
    logger.info('sign args: %o', { password, digest, username, keyType });

    if (!['posting', 'active'].includes(keyType)) {
      throw new Error(`Unsupported keyType: ${keyType}`);
    }

    const authClient = await authService.getOnlineClient();
    const auth = await authClient.getAuthByUser(username);
    logger.info('auth: %o', auth);

    if (!auth) {
      throw new Error(`No auth for username ${username}`);
    }

    if (!auth.authorized) {

      if (!password) {
        password = await this.getPasswordFromUser({
          i18nKeyPlaceholder: 'login_form.password_hbauth_placeholder',
          i18nKeyTitle: 'login_form.title_hbauth_dialog_password'
        });
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

    const signature = await authClient.sign(
      username,
      digest,
      keyType as unknown as 'posting' | 'active'
      );
    logger.info('hbauth: %o', { digest, signature });

    return signature;
  }

  async checkAuths(username: string, keyType: string) {
    const authClient = await authService.getOnlineClient();

    const auths = await authClient.getAuths();
    logger.info('authClient.getAuths();: %o', auths);

    const auths2 = await authClient.getAuthByUser(username);
    logger.info('authClient.getAuthByUser(username): %o', auths2);

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
          // This should not disturb. Wallet is unlocked. This needs testing.
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
