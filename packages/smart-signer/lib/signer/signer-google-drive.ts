import '@smart-signer/lib/signer/zod-jitless';
import { SignChallenge, Signer, SignerOptions, SignTransaction } from '@smart-signer/lib/signer/signer';
import { type ITransaction, THiveRoles, TTransactionPackType } from '@hiveio/wax';
import { siteConfig } from "@hive/ui/config/site";
import { hasOAuthPopupIssues } from '@hive/ui/lib/browser-detect';

import { getLogger } from '@hive/ui/lib/logging';
import { getChain } from '@transaction/lib/chain';
import { verifyAuthorityOrThrow } from '@smart-signer/lib/signer/verify-authority';
import { createExternalWallet, IExternalWallet, IExternalWalletContent } from '@hiveio/wax-signers-external';
import { PasswordFormMode, PasswordFormOptions } from '@smart-signer/components/password-form';
import { PasswordDialogModalPromise } from '@smart-signer/components/password-dialog';
import type { GoogleDriveErrorDialogProps } from '@smart-signer/components/google-drive-error-dialog';
import { missingKeyDialogProps } from '@smart-signer/lib/signer/google-drive-missing-key';
import { GoogleDriveSignInCancelledError } from '@smart-signer/lib/signer/google-drive-sign-in-cancelled';
import {
  isWalletDecryptionFailure,
  needsGoogleSignInAgain,
  WRONG_WALLET_PASSWORD_KEY
} from '@smart-signer/lib/signer/google-drive-wallet-errors';
import { needsFreshPasswordCheck, signAfterFreshPassword } from '@smart-signer/lib/signer/google-drive-fresh-check';
import {
  GOOGLE_OAUTH_CODE_KEY,
  GOOGLE_OAUTH_ERROR_KEY,
  GOOGLE_OAUTH_USERNAME_KEY,
  GOOGLE_OAUTH_KEYTYPE_KEY,
  GOOGLE_OAUTH_NONCE_KEY,
  encodeUrlSafeBase64,
  generateOAuthNonce,
  setOAuthDataWithTimestamp,
  clearOAuthData
} from '@smart-signer/lib/google-oauth-constants';
import {
  googleEncryptionKeyWifCredentialKey,
  googleRefreshTokenCredentialKey,
  readCredential
} from '@smart-signer/lib/signer/credential-storage';
import * as userLocalStorage from '@smart-signer/lib/auth/user-localstore';
import {
  GOOGLE_DRIVE_AUTH_PATH,
  GOOGLE_DRIVE_REFRESH_PATH,
  googleDriveApiUrl,
  googleDriveCallbackUri
} from '@smart-signer/lib/google-drive-urls';
import { LoginType } from '@smart-signer/types/common';
import { loadGoogleIdentityServices } from '@smart-signer/lib/google-identity-script';
import { SignedOutError } from '@transaction/lib/signed-out';
import { isUserCancelled } from '@ui/lib/user-cancelled';

const logger = getLogger('app');

export const hasCompatibleGoogleDriveProvider = () => !!siteConfig.googleDrive.clientId;

/**
 * Whether the Google Drive credentials stored before they were kept per account are `username`'s:
 * they belonged to whoever was signed in with Google Drive then, i.e. the stored current user.
 */
function ownsLegacyCredentials(username: string): boolean {
  const currentUser = userLocalStorage.getUser();
  return currentUser.isLoggedIn && currentUser.loginType === LoginType.google && currentUser.username === username;
}

/* eslint-disable no-restricted-properties -- WIF key is stored permanently without TTL (safe: WIF alone cannot access wallet without Google token) */
function getStoredEncryptionKeyWif(username: string): string | null {
  if (typeof window === 'undefined') return null;
  return readCredential(window.localStorage, googleEncryptionKeyWifCredentialKey(username), () =>
    ownsLegacyCredentials(username)
  );
}

function setStoredEncryptionKeyWif(username: string, wif: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(googleEncryptionKeyWifCredentialKey(username).key, wif);
}

function clearStoredEncryptionKeyWif(username: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(googleEncryptionKeyWifCredentialKey(username).key);
}
/* eslint-enable no-restricted-properties */

/**
 * Shows the dialog pointing the user to Hive Bridge and resolves, once it is closed (by Cancel, ✕
 * or going to Hive Bridge), with the error that ends the sign-in.
 */
async function waitForGoogleDriveErrorDialog(props: GoogleDriveErrorDialogProps): Promise<GoogleDriveSignInCancelledError> {
  const { GoogleDriveErrorDialogPromise } = await import('@smart-signer/components/google-drive-error-dialog');
  const closedBy = await GoogleDriveErrorDialogPromise({ isOpen: true, ...props }).then(
    () => 'dialog',
    (reason: unknown) => String(reason)
  );
  return new GoogleDriveSignInCancelledError(`${props.errorType} (${closedBy})`);
}

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initCodeClient(config: {
            client_id: string;
            scope: string;
            ux_mode: 'popup' | 'redirect';
            redirect_uri?: string;
            state?: string;
            include_granted_scopes?: boolean;
            callback: (response: { code?: string; error?: string }) => void;
          }): {
            requestCode: (options: { prompt: 'consent' | 'none' }) => void;
          }
        }
      }
    }
  }
}

/**
 * Signs challenges (any strings) or Hive transactions with Hive private
 * keys, using [Google Drive](https://gitlab.syncad.com/hive/wax/-/blob/develop/examples/ts/signers-external/README.md).
 *
 * @export
 * @class SignerGoogleDrive
 * @extends {Signer}
 */
export class SignerGoogleDrive extends Signer {
  constructor(signerOptions: SignerOptions) {
    super(signerOptions, TTransactionPackType.HF_26);
  }

  private walletInstance?: Promise<IExternalWalletContent>;
  private rawWallet?: IExternalWallet;
  private _accessToken?: Promise<string>;
  private passwordPromise?: Promise<{ password: string }>;
  private currentKeyType?: keyof THiveRoles;

  private getAccessTokenForRefreshToken = async (refreshToken: string): Promise<string> => {
    const response = await fetch(googleDriveApiUrl(window.location.origin, GOOGLE_DRIVE_REFRESH_PATH), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Google Drive access token');
    }

    const data = await response.json();

    localStorage.setItem(googleRefreshTokenCredentialKey(this.username).key, refreshToken);

    return data.accessToken;
  }

  private getAccessToken(): Promise<string> {
    if (this._accessToken)
      return this._accessToken;

    if (!hasCompatibleGoogleDriveProvider()) {
      throw new Error('Google Drive Signer is not properly configured.');
    }

    // Check for saved refresh token first
    const savedRefresh = readCredential(localStorage, googleRefreshTokenCredentialKey(this.username), () =>
      ownsLegacyCredentials(this.username)
    );
    if (savedRefresh) {
      this._accessToken = this.getAccessTokenForRefreshToken(savedRefresh).catch((err) => {
        logger.error('Error refreshing Google Drive access token: %s', err instanceof Error ? err.message : String(err));

        localStorage.removeItem(googleRefreshTokenCredentialKey(this.username).key);

        this.destroy().catch(() => {});

        throw err;
      });

      return this._accessToken!;
    }

    // Check if we have a pending OAuth code from redirect flow (Safari)
    const pendingCode = sessionStorage.getItem(GOOGLE_OAUTH_CODE_KEY);
    const pendingError = sessionStorage.getItem(GOOGLE_OAUTH_ERROR_KEY);

    if (pendingError) {
      clearOAuthData();
      return Promise.reject(new Error(`Google OAuth error: ${pendingError}`));
    }

    if (pendingCode) {
      // We have a code from redirect - exchange it
      clearOAuthData();

      this._accessToken = this.exchangeCodeForTokens(pendingCode, true);
      return this._accessToken;
    }

    // Determine which OAuth flow to use based on browser
    const useRedirectMode = hasOAuthPopupIssues();

    if (useRedirectMode) {
      return this.initiateRedirectFlow();
    } else {
      return this.initiatePopupFlow();
    }
  }

  /**
   * Initiates OAuth via redirect (for Safari).
   * Stores login context and redirects to Google OAuth.
   *
   * Security measures:
   * - CSRF protection via nonce in state parameter
   * - URL-safe base64 encoding for state
   * - Timestamp for TTL-based cleanup of stale data
   */
  private async initiateRedirectFlow(): Promise<string> {
    await loadGoogleIdentityServices();

    // Generate CSRF nonce and store it for validation on callback
    const nonce = generateOAuthNonce();
    sessionStorage.setItem(GOOGLE_OAUTH_NONCE_KEY, nonce);

    // Store login context for resumption after redirect
    sessionStorage.setItem(GOOGLE_OAUTH_USERNAME_KEY, this.username);
    sessionStorage.setItem(GOOGLE_OAUTH_KEYTYPE_KEY, this.keyType);

    // Set timestamp for TTL-based cleanup
    setOAuthDataWithTimestamp();

    const returnUrl = window.location.href;
    // Use URL-safe base64 encoding and include nonce for CSRF protection
    const state = encodeUrlSafeBase64(JSON.stringify({ returnUrl, nonce }));
    const redirectUri = googleDriveCallbackUri(window.location.origin);

    const tokenClient = window.google.accounts.oauth2.initCodeClient({
      client_id: siteConfig.googleDrive.clientId,
      scope: siteConfig.googleDrive.scopes,
      ux_mode: 'redirect',
      redirect_uri: redirectUri,
      state,
      include_granted_scopes: false,
      callback: () => {
        // This won't be called in redirect mode
      }
    });

    tokenClient.requestCode({ prompt: 'consent' });

    // Return a promise that never resolves (page will redirect)
    return new Promise(() => {});
  }

  /**
   * Initiates OAuth via popup (for Chrome, Firefox, etc.).
   */
  private initiatePopupFlow(): Promise<string> {
    // Already loaded when the form offered Google: the popup has to open within the user's click
    this._accessToken = loadGoogleIdentityServices().then(() => this.requestCodeInPopup());
    return this._accessToken;
  }

  private requestCodeInPopup(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initCodeClient({
        client_id: siteConfig.googleDrive.clientId,
        scope: siteConfig.googleDrive.scopes,
        ux_mode: 'popup',
        include_granted_scopes: false,
        callback: async (response: { code?: string; error?: string }) => {
          if (response.error) {
            reject(new Error(`Google OAuth error: ${response.error}`));
            return;
          }

          try {
            if (!response.code) {
              reject(new Error('No code received from Google Drive OAuth2'));
              return;
            }

            const accessToken = await this.exchangeCodeForTokens(response.code, false);
            resolve(accessToken);
          } catch (error) {
            reject(error);
          }
        }
      });

      tokenClient.requestCode({ prompt: 'consent' });
    });
  }

  /**
   * Exchanges authorization code for access/refresh tokens.
   */
  private async exchangeCodeForTokens(code: string, isRedirectMode: boolean): Promise<string> {
    const body: Record<string, string> = { code };

    // For redirect mode, include the redirect_uri that was used during authorization
    if (isRedirectMode) {
      body.redirectUri = googleDriveCallbackUri(window.location.origin);
    }

    const res = await fetch(googleDriveApiUrl(window.location.origin, GOOGLE_DRIVE_AUTH_PATH), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const data = await res.json();

    if (data.refreshToken) {
      localStorage.setItem(googleRefreshTokenCredentialKey(this.username).key, data.refreshToken);
    }

    return data.accessToken;
  }

  async destroy(): Promise<void> {
    this._accessToken = undefined;
    this.passwordPromise = undefined;
    this.rawWallet = undefined;
    localStorage.removeItem(googleRefreshTokenCredentialKey(this.username).key);
    // Note: We do NOT remove the encryption key WIF here.
    // The WIF alone cannot access the wallet without the Google OAuth token.
  }

  private async getEncryptionCredentials(): Promise<{ password: string } | { encryptionKey: string }> {
    // Check for cached WIF key first
    const cachedWif = getStoredEncryptionKeyWif(this.username);
    if (cachedWif) {
      logger.info('Using cached encryption key WIF for Google Drive wallet');
      return { encryptionKey: cachedWif };
    }

    // No cached WIF - prompt user for password
    const passwordFormOptions: PasswordFormOptions = {
      mode: PasswordFormMode.HBAUTH,
      showInputStorePassword: false,
      validatePassword: (password) => this.checkWalletPassword(password),
      i18nKeysForCaptions: {
        inputPasswordPlaceholder: 'password_form.google_drive_password_placeholder'
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

      // Note: We do NOT store the password here.
      // The WIF will be extracted and cached after wallet loads successfully.
      return { password };
    } catch (error) {
      logger.error('Error in getEncryptionCredentials: %s', error instanceof Error ? error.message : String(error));
      // A closed prompt ends this sign-in only: the next one asks again
      this.passwordPromise = undefined;
      throw new Error('No password from user');
    }
  }

  /**
   * The password prompt's `validatePassword`: resolves with the wrong-password message key when
   * `password` does not decrypt the wallet file, keeping the prompt open for another one, else with
   * null, closing it. Any other failure is left to the wallet load that follows the prompt.
   */
  private async checkWalletPassword(password: string): Promise<string | null> {
    let probe: IExternalWallet | undefined;
    try {
      probe = await createExternalWallet(
        await getChain(),
        () => this.getAccessToken(),
        async () => ({ password }),
        siteConfig.googleDrive.walletFileName
      );
      await probe.enumStoredAccounts();
      return null;
    } catch (error) {
      if (isWalletDecryptionFailure(error)) return WRONG_WALLET_PASSWORD_KEY;
      logger.debug('Google Drive wallet password not checked: %s', error instanceof Error ? error.message : String(error));
      return null;
    } finally {
      await probe?.close();
    }
  }

  private getWallet(username: string, keyType: keyof THiveRoles, forceLogin = false): Promise<IExternalWalletContent> {
    if (forceLogin || (this.currentKeyType && keyType !== this.currentKeyType)) {
      this.walletInstance = undefined;
      this._accessToken = undefined;
      this.passwordPromise = undefined;
      this.rawWallet = undefined;
      // Only clear WIF on forceLogin (explicit re-auth request)
      if (forceLogin) {
        clearStoredEncryptionKeyWif(this.username);
      }
    }

    if (this.walletInstance)
      return this.walletInstance;

    this.walletInstance = new Promise<IExternalWalletContent>(async (resolve, reject) => {
      // Track whether we used cached WIF (to know if we should retry on failure)
      let usedCachedWif = false;
      let usedPassword = false;

      const attemptWalletLoad = async (): Promise<IExternalWalletContent> => {
        const wallet = await createExternalWallet(
          await getChain(),
          () => this.getAccessToken(),
          async (missingStorageFile) => {
            if (missingStorageFile) {
              throw await waitForGoogleDriveErrorDialog({ errorType: 'wallet_not_found' });
            }

            const credentials = await this.getEncryptionCredentials();

            // Track what type of credentials we're using
            if ('encryptionKey' in credentials) {
              usedCachedWif = true;
            } else {
              usedPassword = true;
            }

            return credentials;
          },
          siteConfig.googleDrive.walletFileName
        );

        // Store reference to raw wallet for WIF extraction
        this.rawWallet = wallet;

        // Load the wallet for the specified key type
        let provider: IExternalWalletContent;
        try {
          provider = await wallet.loadForHiveKey(username, keyType);
        } catch (loadError) {
          const dialogProps = missingKeyDialogProps(loadError, username, keyType);
          if (!dialogProps) throw loadError;
          logger.debug('Google Drive wallet lacks a key: %s', loadError instanceof Error ? loadError.message : String(loadError));
          // The password decrypted the wallet, so it is kept: adding the key in Hive Bridge needs no new one
          if (usedPassword) this.cacheEncryptionKeyWif(wallet);
          throw await waitForGoogleDriveErrorDialog(dialogProps);
        }

        logger.info('Obtained Google Drive wallet for user %s with key type %s', username, keyType);

        // If we used a password (not cached WIF), extract and cache the WIF now
        if (usedPassword) this.cacheEncryptionKeyWif(wallet);

        this.currentKeyType = keyType;

        return provider;
      };

      try {
        const provider = await attemptWalletLoad();
        resolve(provider);
      } catch (error) {
        // If we used cached WIF and it failed, it might be from a different Google account
        // Clear WIF and retry with password prompt
        if (usedCachedWif && !usedPassword && !(error instanceof GoogleDriveSignInCancelledError)) {
          logger.info('Wallet load failed with cached WIF, clearing and retrying with password prompt');
          clearStoredEncryptionKeyWif(this.username);
          this.passwordPromise = undefined;
          usedCachedWif = false;

          try {
            const provider = await attemptWalletLoad();
            resolve(provider);
            return;
          } catch (retryError) {
            if (!(retryError instanceof GoogleDriveSignInCancelledError)) {
              logger.error('Error in getWallet retry: %s', retryError instanceof Error ? retryError.message : String(retryError));
            }
            reject(retryError);
            return;
          }
        }

        if (!(error instanceof GoogleDriveSignInCancelledError)) {
          logger.error('Error in getWallet: %s', error instanceof Error ? error.message : String(error));
        }
        reject(error);
      }
    });

    // A failed load is not kept, so the next operation tries again (e.g. after adding the key in Hive Bridge)
    const walletInstance = this.walletInstance;
    walletInstance.catch(() => {
      if (this.walletInstance === walletInstance) this.walletInstance = undefined;
    });

    return walletInstance;
  }

  private cacheEncryptionKeyWif(wallet: IExternalWallet): void {
    try {
      const wif = wallet.getEncryptionKeyWif();
      setStoredEncryptionKeyWif(this.username, wif);
      logger.info('Cached encryption key WIF for Google Drive wallet');
    } catch (wifError) {
      logger.error('Failed to extract/cache encryption key WIF: %s', wifError instanceof Error ? wifError.message : String(wifError));
      // Non-fatal: wallet is already loaded, just won't have cached WIF next time
    }
  }

  /**
   * Gets the wallet, signing in to Google again (`forceLogin`) if the Google token or Drive access
   * failed. A cancel, a wrong password or a missing key rejects without a new Google sign-in.
   */
  private async getWalletOrSignInAgain(username: string, keyType: keyof THiveRoles): Promise<IExternalWalletContent> {
    try {
      return await this.getWallet(username, keyType);
    } catch (error) {
      if (!needsGoogleSignInAgain(error)) throw error;
      logger.error('Error obtaining Google Drive wallet: %s Retrying with forceLogin=true', error instanceof Error ? error.message : String(error));

      return this.getWallet(username, keyType, true);
    }
  }

  async signChallenge({ message }: SignChallenge): Promise<string> {
    const { username, keyType } = this;
    logger.debug('in SignerGoogleDrive.signChallenge %o', { message, username, keyType });
    try {
      const provider = await this.getWalletOrSignInAgain(username, keyType);

      let pk: string | null = null;
      for(const key of provider.enumStoredHiveKeys(username, keyType)) {
        pk = key.publicKey;
        break;
      }
      if (!pk) {
        throw await waitForGoogleDriveErrorDialog({ errorType: 'key_not_found', username, keyType });
      }

      if (typeof message !== "string")
        message = await crypto.subtle.digest(
          "SHA-256",
          new Uint8Array(message as ArrayBuffer)
        );

      const signature = await provider.encryptData(message, pk);

      logger.debug('google signature: %s', signature);
      return signature;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Asks for the wallet password for one operation needing the `keyType` key, in a field the browser
   * does not fill in, and checks it against the wallet before the prompt closes.
   *
   * @throws {Error} "No password from user" when the prompt is closed
   */
  private async askFreshPassword(keyType: keyof THiveRoles): Promise<string> {
    const passwordFormOptions: PasswordFormOptions = {
      mode: PasswordFormMode.HBAUTH,
      showInputStorePassword: false,
      autoComplete: 'one-time-code',
      validatePassword: (password) => this.checkWalletPassword(password),
      i18nKeysForCaptions: {
        title: 'password_form.fresh_check_title',
        description: 'password_form.fresh_check_description',
        inputPasswordPlaceholder: 'password_form.google_drive_password_placeholder',
        submitButtonName: 'password_form.fresh_check_sign_button',
        submitButtonNameWhenWorking: 'login_form.working'
      },
      i18nValues: { keyType }
    };
    try {
      const { password } = await PasswordDialogModalPromise({ isOpen: true, passwordFormOptions });
      return password;
    } catch (error) {
      if (error instanceof SignedOutError) throw error;
      throw new Error('No password from user');
    }
  }

  /** Signs `authTx` with the `keyType` key of the wallet opened by `password`, closing that wallet after */
  private async signWithWalletPassword(authTx: ITransaction, keyType: keyof THiveRoles, password: string): Promise<void> {
    const wallet = await createExternalWallet(
      await getChain(),
      () => this.getAccessToken(),
      async (missingStorageFile) => {
        if (missingStorageFile) {
          throw await waitForGoogleDriveErrorDialog({ errorType: 'wallet_not_found' });
        }
        return { password };
      },
      siteConfig.googleDrive.walletFileName
    );
    try {
      let provider: IExternalWalletContent;
      try {
        provider = await wallet.loadForHiveKey(this.username, keyType);
      } catch (loadError) {
        const dialogProps = missingKeyDialogProps(loadError, this.username, keyType);
        if (!dialogProps) throw loadError;
        throw await waitForGoogleDriveErrorDialog(dialogProps);
      }
      await provider.signTransaction(authTx);
    } finally {
      await wallet.close();
    }
  }

  /**
   * Signs `authTx` with a wallet opened for it alone by a password asked for it alone: an earlier
   * sign-in or cached encryption key does not sign an operation needing the active or owner key.
   */
  private signWithFreshPassword(authTx: ITransaction, keyType: keyof THiveRoles): Promise<void> {
    return signAfterFreshPassword(
      () => this.askFreshPassword(keyType),
      (password) => this.signWithWalletPassword(authTx, keyType, password),
      (error) => {
        logger.error('Error opening Google Drive wallet: %s Signing in to Google again', error instanceof Error ? error.message : String(error));
        this._accessToken = undefined;
      }
    );
  }

  async signTransaction({ transaction, requiredKeyType }: SignTransaction): Promise<string> {
    try {
      const authTx = (await getChain()).createTransactionFromProto(transaction);
      const keyType = requiredKeyType ?? this.keyType;

      if (needsFreshPasswordCheck(keyType)) {
        await this.signWithFreshPassword(authTx, keyType);
      } else {
        const provider = await this.getWalletOrSignInAgain(this.username, keyType);
        await provider.signTransaction(authTx);
      }

      await verifyAuthorityOrThrow(authTx.toApiJson(), TTransactionPackType.HF_26, this.keyType, 'Google Drive');
      logger.debug('authTx.transaction.signatures: %o', authTx.transaction.signatures);
      return authTx.transaction.signatures[0];
    } catch (error) {
      if (!(error instanceof GoogleDriveSignInCancelledError) && !isUserCancelled(error)) {
        logger.error('SignerGoogleDrive.signTransaction error: %s', error instanceof Error ? error.message : String(error));
      }
      throw error;
    }
  }
}
