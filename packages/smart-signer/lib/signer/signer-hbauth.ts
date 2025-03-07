import { cryptoUtils } from '@hiveio/dhive';
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { AuthStatus, KeyAuthorityType } from '@hiveio/hb-auth';
import { SignChallenge, SignTransaction, Signer, SignerOptions } from '@smart-signer/lib/signer/signer';
import { THexString, createWaxFoundation, TTransactionPackType } from '@hiveio/wax';
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
  /**
   * Pending promise, returning output from dialog asking user for
   * password, or null. Intended for awaiting by any requests for
   * password coming when dialog is already opened. All subscribers will
   * get the same user's answer.
   *
   * @type {(Promise<any> | null)}
   * @memberof SignerHbauth
   */
  passwordPromise: Promise<any> | null;

  constructor(signerOptions: SignerOptions, pack: TTransactionPackType = TTransactionPackType.HF_26) {
    super(signerOptions, pack);
    this.passwordPromise = null;
  }

  async destroy() {
    const authClient = await hbauthService.getOnlineClient();
    await authClient.logout(this.username);
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
        inputPasswordPlaceholder: 'login_form.password_hbauth_placeholder'
      }
    };

    try {
      if (!this.passwordPromise) {
        this.passwordPromise = PasswordDialogModalPromise({
          isOpen: true,
          passwordFormOptions
        });
      }
      const { password } = await this.passwordPromise;
      return password;
    } catch (error) {
      logger.error('Error in getPasswordFromUser: %o', error);
      throw new Error('No password from user');
    }
  }

  async signChallenge(
    { password = '', message }: SignChallenge,
    singleSignKeyType?: KeyAuthorityType,
    requiredKeyType?: KeyAuthorityType
  ): Promise<string> {
    const digest = cryptoUtils.sha256(message).toString('hex');
    return this.signDigest(digest, password, singleSignKeyType, requiredKeyType);
  }

  async signTransaction({ digest, transaction, singleSignKeyType, requiredKeyType }: SignTransaction) {
    const wax = await createWaxFoundation({ chainId: this.chainId });

    // When transaction is string, e.g. got from transaction.toApi().
    // const txBuilder = wax.TransactionBuilder.fromApi(transaction);

    const txBuilder = wax.createTransactionFromProto(transaction);
    if (digest !== txBuilder.sigDigest) {
      throw new Error('Digests do not match');
    }

    return this.signDigest(digest, '', singleSignKeyType, requiredKeyType);
  }

  async signDigest(
    digest: THexString,
    password: string,
    singleSignKeyType?: KeyAuthorityType,
    requiredKeyType?: KeyAuthorityType
  ) {
    const { username, keyType } = this;
    logger.info('signDigest args: %o', { password, digest, username, keyType });

    const validKeyTypes = ['posting', 'active', 'owner'];
    if (!validKeyTypes.includes(keyType)) {
      throw new Error(`Unsupported keyType: ${keyType}`);
    }

    const authClient = await hbauthService.getOnlineClient();
    const checkAuthResult = await this.checkAuth(username, keyType);

    if (!checkAuthResult) {
      if (!password) {
        password = await this.getPasswordFromUser();
      }
      if (!password) throw new Error('No password to unlock key');

      let authStatus: AuthStatus = { ok: false };
      try {
        authStatus = await authClient.authenticate(username, password, keyType);
      } catch (error) {
        logger.error('Error in signDigest, when trying to authenticate user: %o', error);

        //
        // TODO AuthorizationError is not exported in hb-auth yet (issue
        // created). Check this in their newer version and use
        // `instanceof` if possible.
        //

        // if (error instanceof AuthorizationError)

        if (error && `${error}` === 'AuthorizationError: User is already logged in') {
          logger.info('Swallowing error: AuthorizationError: User is already logged in');
          // Swallow this error, it's OK.
          authStatus.ok = true;
        } else {
          throw error;
        }
      }

      logger.info('authStatus', { authStatus });
      if (!authStatus.ok) {
        throw new Error(`Unlocking key failed`);
      }
    }

    let signature = '';

    if (singleSignKeyType) {
      if (!validKeyTypes.includes(singleSignKeyType)) {
        throw new Error(`Unsupported singleSignKeyType: ${singleSignKeyType}`);
      }

      // Get password for single sign
      const passwordFormOptions: PasswordFormOptions = {
        mode: PasswordFormMode.HBAUTH,
        showInputStorePassword: false,
        i18nKeysForCaptions: {
          title: `login_form.this_operation_requires_your_key_for_single_sign_${singleSignKeyType}`,
          inputPasswordPlaceholder: 'login_form.title_wif_dialog_password'
        }
      };

      try {
        const { password: singleSignPassword } = await PasswordDialogModalPromise({
          isOpen: true,
          passwordFormOptions
        });

        if (!singleSignPassword) {
          throw new Error('No key provided for single sign');
        }

        signature = await authClient.singleSign(username, digest, singleSignPassword, singleSignKeyType);
      } catch (error) {
        logger.error('Error in single sign: %o', error);
        throw error;
      }
    }
    if (requiredKeyType && requiredKeyType !== keyType) {
      signature = await this.requireOtherKey(requiredKeyType, username, digest, password);
    } else {
      signature = await authClient.sign(username, digest, keyType);
    }

    logger.info('hbauth: %o', { digest, signature });
    return signature;
  }

  async checkAuth(username: string, keyType: string): Promise<boolean> {
    const authClient = await hbauthService.getOnlineClient();
    const auths = await authClient.getRegisteredUsers();
    logger.info('auths in safe storage %o', auths);
    const auth = await authClient.getRegisteredUserByUsername(username);
    const settings = await authClient.getUserSettings(username);

    // set authorityUsername to the keyType that is authorized for this user
    this.authorityUsername = settings?.authorizedAccounts?.[keyType as KeyAuthorityType];

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
            username,
            auth.loggedInKeyType
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
  // This method is used to sign with a different key than the one that is currently unlocked
  async requireOtherKey(
    keyType: KeyAuthorityType,
    username: string,
    digest: string,
    password: string
  ): Promise<string> {
    const authClient = await hbauthService.getOnlineClient();
    const auths = await authClient.getRegisteredUserByUsername(username);
    if (!auths) throw new Error('User not found');

    const passwordFormOptions: PasswordFormOptions = {
      mode: PasswordFormMode.HBAUTH,
      showInputStorePassword: false,
      i18nKeysForCaptions: {
        title: `login_form.this_operation_requires_your_${keyType}_key_enter_key_and_keep_it_in_safe_storage`,
        inputPasswordPlaceholder: 'login_form.title_wif_dialog_password'
      }
    };

    // If key is not registered in safe storage, ask user to enter it
    if (!auths.registeredKeyTypes.includes(keyType)) {
      try {
        const { password: keyToUse } = await PasswordDialogModalPromise({
          isOpen: true,
          passwordFormOptions
        });
        // Import other key to safe storage
        await authClient.register(username, password, keyToUse, keyType);
      } catch (error) {
        logger.error('Error in getPasswordFromUser: %o', error);
        throw new Error('Invalid key');
      }
    }
    // Sign with the required key
    return await authClient.sign(username, digest, keyType);
  }
}
