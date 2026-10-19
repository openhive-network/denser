import { hbauthService } from '@smart-signer/lib/hbauth-service';
import type { AuthStatus, KeyAuthorityType, OfflineClient, OnlineClient } from '@hiveio/hb-auth';
import { SignChallenge, SignTransaction, Signer, SignerOptions } from '@smart-signer/lib/signer/signer';
import { THexString, TTransactionPackType } from '@hiveio/wax';
import { PasswordDialogModalPromise } from '@smart-signer/components/password-dialog';
import { PasswordFormMode, PasswordFormOptions } from '@smart-signer/components/password-form';
import { getLogger } from '@ui/lib/logging';
import { getChain } from '@transaction/lib/chain';
import { AuthStorageMissingError, isIgnorableError, parseAuthError } from '@smart-signer/lib/auth-error';
import { notifySafeStorageKeysChanged } from '@smart-signer/lib/signer/safe-storage-keys';
import { registerAddedSafeStorageKey } from '@smart-signer/lib/signer/safe-storage-registration';
import { SHARED_KEY_LOOKUP } from '@smart-signer/lib/auth/shared-key-types';
import { unlockHint } from '@smart-signer/lib/signer/unlock-hint';

const logger = getLogger('app');

const VALID_KEY_TYPES = ['posting', 'active', 'owner'];

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

  get hbAuthClient(): Promise<OfflineClient | OnlineClient> {
    return hbauthService.getOnlineClient();
  }

  constructor(signerOptions: SignerOptions, pack: TTransactionPackType = TTransactionPackType.HF_26) {
    super(signerOptions, pack);
    this.passwordPromise = null;
  }

  async destroy() {
    await hbauthService.logout(this.username);
  }

  protected getPasswordPromise(passwordFormOptions: PasswordFormOptions): Promise<{ password: string }> {
    return PasswordDialogModalPromise({
      isOpen: true,
      passwordFormOptions
    });
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
        this.passwordPromise = this.getPasswordPromise(passwordFormOptions);
      }
      const { password } = await this.passwordPromise;
      return password;
    } catch (error) {
      logger.error('Error in getPasswordFromUser: %s', error instanceof Error ? error.message : String(error));
      throw new Error('No password from user');
    }
  }

  async signChallenge(
    { password = '', message }: SignChallenge,
    singleSignKeyType?: KeyAuthorityType,
    requiredKeyType?: KeyAuthorityType
  ): Promise<string> {
    // TODO: Temporary solution to remove legacy d hive crypto (using native solutions). But eventually we should remove this function
    const msgUint8 = typeof message === "string" ? new TextEncoder().encode(message) : new Uint8Array(message as ArrayBuffer); // encode as (utf-8) ArrayBuffer | ArrayBufferView<ArrayBuffer>
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8); // hash the message
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''); // Convert ArrayBuffer to hex string.

    return this.signDigest(hashHex, password, singleSignKeyType, requiredKeyType);
  }

  async signTransaction({ digest, transaction, singleSignKeyType, requiredKeyType }: SignTransaction) {
    const wax = await getChain();

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
    logger.info('signDigest args: %o', { digest, username, keyType });

    if (!VALID_KEY_TYPES.includes(keyType)) {
      throw new Error(`Unsupported keyType: ${keyType}`);
    }

    return hbauthService.withOnlineClient((authClient) =>
      this.signDigestWith(authClient, digest, password, singleSignKeyType, requiredKeyType)
    );
  }

  private async signDigestWith(
    authClient: OnlineClient,
    digest: THexString,
    password: string,
    singleSignKeyType?: KeyAuthorityType,
    requiredKeyType?: KeyAuthorityType
  ): Promise<string> {
    const { username, keyType } = this;
    const checkAuthResult = await this.checkAuth(authClient, username, keyType, requiredKeyType);

    if (!checkAuthResult) {
      let authStatus: AuthStatus = { ok: false };

      // Try biometric unlock first (if passkey registered and no password provided)
      if (!password) {
        try {
          const hasPasskey = await authClient.hasPasskey(username);
          if (hasPasskey) {
            // Use minimal verification for posting (blog), full verification for active/owner (wallet)
            const uv = keyType === 'posting' ? 'discouraged' : 'required';
            logger.info('Attempting biometric unlock for %s (uv=%s)', username, uv);
            authStatus = await authClient.biometricUnlock(
              username, keyType, uv as UserVerificationRequirement
            );
          }
        } catch (error) {
          // Biometric failed (cancelled, passkey deleted, unsupported) — fall through to password
          logger.info('Biometric unlock failed, falling back to password: %s',
            error instanceof Error ? error.message : String(error));
        }
      }

      // Fall back to password if biometric didn't succeed
      if (!authStatus.ok) {
        if (!password) {
          password = await this.getPasswordFromUser();
        }
        if (!password) throw new Error('No password to unlock key');

        try {
          authStatus = await authClient.authenticate(username, password, keyType);
        } catch (error) {
          logger.error('Error in signDigest, when trying to authenticate user: %s', error instanceof Error ? error.message : String(error));

          // Check if this is an ignorable error (e.g., "User is already logged in")
          if (isIgnorableError(error)) {
            logger.info('Ignoring expected error during authentication');
            authStatus.ok = true;
          } else {
            const { message } = parseAuthError(error);
            throw new Error(message, { cause: error });
          }
        }
      }

      logger.info('authStatus', { authStatus });
      if (!authStatus.ok) {
        throw new Error(`Unlocking key failed`);
      }
    }

    if (singleSignKeyType) {
      if (!VALID_KEY_TYPES.includes(singleSignKeyType)) {
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
        const signature = await authClient.singleSign(
          username,
          digest,
          singleSignPassword,
          singleSignKeyType
        );
        return signature;
      } catch (error) {
        logger.error('Error in single sign: %s', error instanceof Error ? error.message : String(error));
        throw error;
      }
    }

    if (requiredKeyType && requiredKeyType !== keyType) {
      const signature = await this.requireOtherKey(authClient, requiredKeyType, username, digest, password);
      return signature;
    } else {
      const signature = await authClient.sign(username, digest, keyType);
      logger.info('hbauth: %o', { digest, signature });
      return signature;
    }
  }

  async checkAuth(
    authClient: OnlineClient,
    username: string,
    keyType: string,
    requiredKeyType?: KeyAuthorityType
  ): Promise<boolean> {
    const auths = await authClient.getRegisteredUsers();
    logger.info('auths in safe storage %o', auths);
    const auth = await authClient.getRegisteredUserByUsername(username);
    const settings = await authClient.getUserSettings(username);

    // set authorityUsername to the keyType that is authorized for this user
    this.authorityUsername = settings?.authorizedAccounts?.[keyType as KeyAuthorityType];

    if (auth) {
      logger.info('Found auth for user %s: %o', username, auth);
      if (auth.unlocked) {
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
        logger.info(
          'User %s exists but is not authorized. Hint: %s',
          username,
          unlockHint(keyType, requiredKeyType)
        );
        // We should tell to unlock wallet.
        return false;
      }
    } else {
      logger.error('Auth for user %s not found — IndexedDB key storage may have been cleared', username);
      throw new AuthStorageMissingError(username, keyType);
    }
  }
  // This method is used to sign with a different key than the one that is currently unlocked
  async requireOtherKey(
    authClient: OnlineClient,
    keyType: KeyAuthorityType,
    username: string,
    digest: string,
    password: string
  ): Promise<string> {
    const auths = await authClient.getRegisteredUserByUsername(username);
    if (!auths) throw new Error('User not found');

    // If key is not registered in safe storage, ask user to enter it
    if (!auths.registeredKeyTypes.includes(keyType)) {
      await this.registerKey(authClient, keyType, password);
    }
    // The account holding authority over this one, when the required key is one of its keys
    const settings = await authClient.getUserSettings(username);
    this.authorityUsername = settings?.authorizedAccounts?.[keyType];
    // Sign with the required key
    return await authClient.sign(username, digest, keyType);
  }

  /**
   * Asks for the `keyType` key and keeps it in safe storage next to the session's key, so later
   * operations needing it sign without asking. Does nothing when safe storage already holds it.
   *
   * @throws {AuthStorageMissingError} when safe storage does not know the account
   */
  async addKey(keyType: KeyAuthorityType): Promise<void> {
    await hbauthService.withOnlineClient(async (authClient) => {
      const auth = await authClient.getRegisteredUserByUsername(this.username);
      if (!auth) throw new AuthStorageMissingError(this.username, keyType);
      if (auth.registeredKeyTypes.includes(keyType)) return;
      await this.registerKey(authClient, keyType, '');
    });
  }

  /**
   * Asks for the `keyType` key and registers it in safe storage, in the Direct Authority Mode the
   * session's key was registered with, and for the session's key type too when it is that key as
   * well. `password` is the safe storage password when this flow already has it; otherwise it is
   * asked for, once per signer.
   */
  private async registerKey(authClient: OnlineClient, keyType: KeyAuthorityType, password: string): Promise<void> {
    const passwordFormOptions: PasswordFormOptions = {
      mode: PasswordFormMode.HBAUTH,
      showInputStorePassword: false,
      i18nKeysForCaptions: {
        title: `login_form.this_operation_requires_your_${keyType}_key_enter_key_and_keep_it_in_safe_storage`,
        inputPasswordPlaceholder: 'login_form.title_wif_dialog_password'
      }
    };
    if (!password) password = await this.getPasswordFromUser();
    try {
      const { password: keyToUse } = await PasswordDialogModalPromise({
        isOpen: true,
        passwordFormOptions
      });
      await registerAddedSafeStorageKey(
        authClient,
        { username: this.username, password, wif: keyToUse, keyType },
        this.keyType,
        SHARED_KEY_LOOKUP
      );
    } catch (error) {
      logger.error('Error in registerKey: %s', error instanceof Error ? error.message : String(error));
      // Preserve the actual error message instead of generic "Invalid key"
      const { message } = parseAuthError(error, 'Invalid key');
      throw new Error(message, { cause: error });
    }
    notifySafeStorageKeysChanged();
  }
}
