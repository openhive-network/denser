import { KeyTypes } from '@smart-signer/types/common';
import { cryptoUtils } from '@hiveio/dhive';
import { authService } from '@smart-signer/lib/auth-service';
import { SignChallenge, BroadcastOperation } from '@smart-signer/lib/signer';
import { getDynamicGlobalProperties } from '@ui/lib/hive';
import { createWaxFoundation, TBlockHash, createHiveChain, BroadcastTransactionRequest, vote, operation } from '@hive/wax';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');


export class SignerHbauth {

  // Create digest and return its signature made with signDigest.
  async signChallenge({
    username,
    password = '',
    message,
    keyType = KeyTypes.posting
  }: SignChallenge) {
    const digest = cryptoUtils.sha256(message).toString('hex');
    return this.signDigest(
      digest, username, password, keyType
    );
  }

  async broadcastOperation({
    operation,
    loginType,
    username,
    keyType = KeyTypes.posting
  }: BroadcastOperation): Promise<{ success: boolean, error: string}> {

    let result = { success: true, error: ''};
    try {
      //
      // TODO These lines below do not work. Validation error in Wax
      // occurs. Looks like a bug in Wax.
      //

      // const hiveChain = await createHiveChain();
      // const tx = await hiveChain.getTransactionBuilder('+1m');

      const dynamicGlobalData = await getDynamicGlobalProperties();
      const wax = await createWaxFoundation();
      const tx = new wax.TransactionBuilder(dynamicGlobalData?.head_block_id as unknown as TBlockHash, '+1m');
      tx.push(operation);
      logger.info('bamboo tx', tx.toApi());

      const signature = await this.signDigest(
        tx.sigDigest,
        username,
        '',
        keyType
      );

      // const authClient = await authService.getOnlineClient();
      // const signature = await authClient.sign('stirlitz', tx.sigDigest, 'posting');

      logger.info('bamboo signature', signature);

      const transaction = tx.build();
      transaction.signatures.push(signature);
      logger.info('bamboo tx signed', tx.toApi());

      const transactionRequest = new BroadcastTransactionRequest(tx);
      const hiveChain = await createHiveChain();

      const result = await hiveChain.api.network_broadcast_api.broadcast_transaction(transactionRequest);
      logger.info('bamboo result', result);

    } catch (error) {
      logger.trace('SignerHbauth.broadcastOperation error: %o', error);
      result = { success: false, error: 'Sign failed'};
      throw error;
    }

    logger.info('bamboo returning: %o', result);
    return result;
  }

  async signDigest(
    digest: string,
    username: string,
    password: string,
    keyType: KeyTypes = KeyTypes.posting
  ) {
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
        // TODO get password from storage or prompt user to input it.
        const userInput = prompt("Please enter ypur password to unlock wallet", "");
        password = userInput as string;
        // throw new Error('No password to unlock wallet')
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

    const signature = await authClient.sign(
      username,
      digest,
      keyType as unknown as 'posting' | 'active'
    );
    logger.info('hbauth: %o', { digest, signature });

    return signature;
  };

  async checkAuths(username: string, keyType: string) {
    const authClient = await authService.getOnlineClient();
    const auths = await authClient.getAuths();
    logger.info('auths: %o', auths);
    // await authClient.logout();
    const auth = auths.find((auth) => auth.username === username);
    if (auth) {
      logger.info('found auth: %o', auth);
      if (auth.authorized) {
        if (auth.keyType === keyType) {
          logger.info('user is authorized and we are ready to proceed');
          // We're ready to sign loginChallenge and proceed.
        } else {
          logger.info('user is authorized, but with incorrect keyType: %s', auth.keyType);
        }
      } else {
        logger.info('user is not authorized');
        // We should tell to unlock wallet (login to wallet).
      }
    } else {
      logger.info('auth for user not found: %s', username);
      // We should offer adding account to wallet.
    }
  };

}