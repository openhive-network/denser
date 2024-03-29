import { cryptoUtils } from '@hiveio/dhive';
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { SignChallenge, SignTransaction, Signer, SignerOptions } from '@smart-signer/lib/signer/signer';
import { THexString, createWaxFoundation, TTransactionPackType } from '@hive/wax';
import { PasswordDialogModalPromise } from '@smart-signer/components/password-dialog';
import { PasswordFormMode, PasswordFormOptions } from '@smart-signer/components/password-form';

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

  /**
   * Displays dialog and asks user to enter password for unlocking
   * wallet.
   *
   * @returns {Promise<string>}
   * @memberof SignerHbauth
   */
  async getPasswordFromUser(): Promise<string> {
    const passwordFormOptions: PasswordFormOptions = {
      mode: PasswordFormMode.HBAUTH,
      showInputStorePassword: false,
      i18nKeysForCaptions: {
        inputPasswordPlaceholder: 'login_form.password_hbauth_placeholder',
      },
    };

    try {
      const {
        password
      } = await PasswordDialogModalPromise({
        isOpen: true,
        passwordFormOptions
      });
      return password;
    } catch (error) {
      logger.error('Error in getPasswordFromUser: %o', error);
      throw new Error('No password from user');
    }
  }

  async signChallenge(
    { password = '', message }: SignChallenge
    ): Promise<string> {
    const digest = cryptoUtils.sha256(message).toString('hex');
    return this.signDigest(digest, password);
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
    if (!checkAuthResult) {
      if (!password) {
        password = await this.getPasswordFromUser();
      }
      if (!password) throw new Error('No password to unlock key');

      logger.info('authClient.authenticate args: %o', { username, password, keyType });
      const authStatus = await authClient.authenticate(
        username,
        password,
        keyType as unknown as 'posting' | 'active'
      );
      logger.info('authStatus', { authStatus });
      if (!authStatus.ok) {
        throw new Error(`Unlocking key failed`);
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
    logger.info('auths in safe storage %o', auths);
    const auth = await authClient.getAuthByUser(username);
    if (auth) {
      logger.info('Found auth for user %s: %o', username, auth);
      if (auth.authorized) {
        if (auth.loggedInKeyType === keyType) {
          logger.info('User %s is authorized and we are ready to proceed', username);
          // Everything is OK.
          return true;
        } else {
          logger.info(
            'User %s is authorized, but with incorrect keyType: %s. It is OK anyway.',
            username, auth.loggedInKeyType
            );
          // This should not disturb. Wallet is unlocked.
          return true;
        }
      } else {
        logger.info('User %s exists but is not authorized. Hint: unlock key %s', username, keyType);
        // We should tell to unlock wallet.
        return false;
      }
    } else {
      const message = `Auth for user ${username} not found. Hint: add ${keyType} key to safe storage.`;
      logger.error(message);
      // We should offer adding key to wallet.
      throw new Error(message);
    }
  }

}
