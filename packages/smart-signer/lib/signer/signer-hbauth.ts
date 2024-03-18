import { cryptoUtils } from '@hiveio/dhive';
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { SignChallenge, SignTransaction, Signer, SignerOptions } from '@smart-signer/lib/signer/signer';
import { DialogPasswordModalPromise } from '@smart-signer/components/dialog-password';
import { THexString, createWaxFoundation, TTransactionPackType } from '@hive/wax';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Signs challenges (any strings) or Hive transactions with Hive private
 * keys, using [Hbauth](https://gitlab.syncad.com/hive/hb-auth).
 *
 * @export
 * @class SignerHbauth
 * @extends {Signer}
 */
export class SignerHbauth extends Signer {

  constructor(
    signerOptions: SignerOptions,
    pack: TTransactionPackType = TTransactionPackType.HF_26
    ) {
    super(signerOptions, pack);
  }

  async destroy() {
    const authClient = await hbauthService.getOnlineClient();
    await authClient.logout();
  }

  async getPasswordFromUser(dialogProps: { [key: string]: any } = {}): Promise<string> {
    let password = '';
    try {
      const result = await DialogPasswordModalPromise({
        isOpen: true,
        ...dialogProps
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
  async signChallenge({ password = '', message }: SignChallenge): Promise<string> {
    const { username, keyType } = this;
    const digest = cryptoUtils.sha256(message).toString('hex');

    await this.checkAuth(username, keyType);

    const signature = await this.signDigest(digest, password);
    logger.info('hbauth', { signature });
    return signature;
  }

  async signTransaction({ digest, transaction }: SignTransaction) {
    const wax = await createWaxFoundation();

    // When transaction is string, e.g. got from transaction.toApi().
    // const txBuilder = wax.TransactionBuilder.fromApi(transaction);

    const txBuilder = new wax.TransactionBuilder(transaction);
    if (digest !== txBuilder.sigDigest) {
      throw new Error('Digests do not match');
    }

    // TODO Show transaction in UI and get user's consent to sign it.

    return this.signDigest(digest, '');
  }

  async signDigest(digest: THexString, password: string) {
    const { username, keyType } = this;
    logger.info('signDigest args: %o', { password, digest, username, keyType });

    if (!['posting', 'active'].includes(keyType)) {
      throw new Error(`Unsupported keyType: ${keyType}`);
    }

    const authClient = await hbauthService.getOnlineClient();

    const checkAuthResult = await this.checkAuth(username, keyType);

    // const auth = await authClient.getAuthByUser(username);
    // logger.info('auth: %o', auth);
    // if (!auth) {
    //   throw new Error(`No auth for username ${username}`);
    // }

    if (!checkAuthResult) {
      if (!password) {
        password = await this.getPasswordFromUser({
          i18nKeyPlaceholder: ['login_form.password_hbauth_placeholder', {}],
          // i18nKeyDescription: ['login_form.title_hbauth_dialog_password', {username, keyType}]
        });
      }

      logger.info('authClient.authenticate args: %o', { username, password, keyType });
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

  async checkAuth(username: string, keyType: string): Promise<boolean> {

    const authClient = await hbauthService.getOnlineClient();
    const auths = await authClient.getAuths();
    logger.info('authClient.getAuths(): %o', auths);
    const authsByUser = await authClient.getAuthByUser(username);
    logger.info('authClient.getAuthByUser(username): %o', authsByUser);
    const auth = auths.find((auth) => auth.username === username);
    if (auth) {
      logger.info('Found auth for user %s: %o', username, auth);
      if (auth.authorized) {
        if (auth.keyType === keyType) {
          logger.info('User %s is authorized and we are ready to proceed', username);
          // We're ready to sign loginChallenge and proceed.
          return true;
        } else {
          logger.info('User %s is authorized, but with incorrect keyType: %s', username, auth.keyType);
          // This should not disturb. Wallet is unlocked.
          return true;
        }
      } else {
        logger.info('User %s exists but is not authorized. Hint: unlock key %s', username, keyType);
        // We should tell to unlock wallet.
        return false;
      }
    } else {
      const message = `Auth for user ${username} not found. Hint: add ${keyType} key to hbauth.`;
      logger.info(message);
      // We should offer adding key to wallet.
      throw new Error(message);
    }
  }
}
