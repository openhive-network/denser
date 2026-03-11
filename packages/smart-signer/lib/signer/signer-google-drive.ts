import { SignChallenge, Signer, SignerOptions, SignTransaction } from '@smart-signer/lib/signer/signer';
import { THiveRoles, TTransactionPackType } from '@hiveio/wax';
import { siteConfig } from "@hive/ui/config/site";
import { hasOAuthPopupIssues } from '@hive/ui/lib/browser-detect';

import { getLogger } from '@hive/ui/lib/logging';
import { getChain } from '@transaction/lib/chain';
import { verifyAuthorityOrThrow } from '@smart-signer/lib/signer/verify-authority';
import { createExternalWallet, IExternalWallet, IExternalWalletContent } from '@hiveio/wax-signers-external';
import { PasswordFormMode, PasswordFormOptions } from '@smart-signer/components/password-form';
import { PasswordDialogModalPromise } from '@smart-signer/components/password-dialog';
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

const logger = getLogger('app');

export const hasCompatibleGoogleDriveProvider = () => !!siteConfig.googleDrive.clientId;

const GOOGLE_DRIVE_REFRESH_TOKEN_LOCALSTORAGE_KEY = 'google_refresh_token';
const GOOGLE_DRIVE_ENCRYPTION_KEY_WIF_LOCALSTORAGE_KEY = 'gdrive_encryption_key_wif';

/* eslint-disable no-restricted-properties -- WIF key is stored permanently without TTL (safe: WIF alone cannot access wallet without Google token) */
function getStoredEncryptionKeyWif(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(GOOGLE_DRIVE_ENCRYPTION_KEY_WIF_LOCALSTORAGE_KEY);
}

function setStoredEncryptionKeyWif(wif: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(GOOGLE_DRIVE_ENCRYPTION_KEY_WIF_LOCALSTORAGE_KEY, wif);
}

function clearStoredEncryptionKeyWif(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(GOOGLE_DRIVE_ENCRYPTION_KEY_WIF_LOCALSTORAGE_KEY);
}
/* eslint-enable no-restricted-properties */

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
    const response = await fetch(`${window.location.origin}/api/google-drive/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Google Drive access token');
    }

    const data = await response.json();

    localStorage.setItem(GOOGLE_DRIVE_REFRESH_TOKEN_LOCALSTORAGE_KEY, refreshToken);

    return data.accessToken;
  }

  private getAccessToken(): Promise<string> {
    if (this._accessToken)
      return this._accessToken;

    if (!hasCompatibleGoogleDriveProvider()) {
      throw new Error('Google Drive Signer is not properly configured.');
    }

    // Check for saved refresh token first
    const savedRefresh = localStorage.getItem(GOOGLE_DRIVE_REFRESH_TOKEN_LOCALSTORAGE_KEY);
    if (savedRefresh) {
      this._accessToken = this.getAccessTokenForRefreshToken(savedRefresh).catch((err) => {
        logger.error('Error refreshing Google Drive access token: %s', err instanceof Error ? err.message : String(err));

        localStorage.removeItem(GOOGLE_DRIVE_REFRESH_TOKEN_LOCALSTORAGE_KEY);

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
  private initiateRedirectFlow(): Promise<string> {
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
    const redirectUri = `${window.location.origin}/api/google-drive/callback`;

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
    this._accessToken = new Promise<string>((resolve, reject) => {
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

    return this._accessToken;
  }

  /**
   * Exchanges authorization code for access/refresh tokens.
   */
  private async exchangeCodeForTokens(code: string, isRedirectMode: boolean): Promise<string> {
    const body: Record<string, string> = { code };

    // For redirect mode, include the redirect_uri that was used during authorization
    if (isRedirectMode) {
      body.redirectUri = `${window.location.origin}/api/google-drive/callback`;
    }

    const res = await fetch(`${window.location.origin}/api/google-drive/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const data = await res.json();

    if (data.refreshToken) {
      localStorage.setItem(GOOGLE_DRIVE_REFRESH_TOKEN_LOCALSTORAGE_KEY, data.refreshToken);
    }

    return data.accessToken;
  }

  async destroy(): Promise<void> {
    this._accessToken = undefined;
    this.passwordPromise = undefined;
    this.rawWallet = undefined;
    localStorage.removeItem(GOOGLE_DRIVE_REFRESH_TOKEN_LOCALSTORAGE_KEY);
    // Note: We do NOT remove the encryption key WIF here.
    // The WIF alone cannot access the wallet without the Google OAuth token.
  }

  private async getEncryptionCredentials(): Promise<{ password: string } | { encryptionKey: string }> {
    // Check for cached WIF key first
    const cachedWif = getStoredEncryptionKeyWif();
    if (cachedWif) {
      logger.info('Using cached encryption key WIF for Google Drive wallet');
      return { encryptionKey: cachedWif };
    }

    // No cached WIF - prompt user for password
    const passwordFormOptions: PasswordFormOptions = {
      mode: PasswordFormMode.HBAUTH,
      showInputStorePassword: false,
      i18nKeysForCaptions: {
        inputPasswordPlaceholder: 'Password to unlock Google Drive wallet',
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
      throw new Error('No password from user');
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
        clearStoredEncryptionKeyWif();
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
              // Show error dialog with link to Hive Bridge
              const { GoogleDriveErrorDialogPromise } = await import('@smart-signer/components/google-drive-error-dialog');
              await GoogleDriveErrorDialogPromise({
                isOpen: true,
                errorType: 'wallet_not_found'
              });
              // Dialog will reject if user closes it, but if we somehow get here, still throw
              throw new Error('Google Drive wallet file not found');
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
        const provider = await wallet.loadForHiveKey(username, keyType);

        logger.info('Obtained Google Drive wallet for user %s with key type %s', username, keyType);

        // If we used a password (not cached WIF), extract and cache the WIF now
        if (usedPassword) {
          try {
            const wif = wallet.getEncryptionKeyWif();
            setStoredEncryptionKeyWif(wif);
            logger.info('Cached encryption key WIF for Google Drive wallet');
          } catch (wifError) {
            logger.error('Failed to extract/cache encryption key WIF: %s', wifError instanceof Error ? wifError.message : String(wifError));
            // Non-fatal: wallet is already loaded, just won't have cached WIF next time
          }
        }

        this.currentKeyType = keyType;

        return provider;
      };

      try {
        const provider = await attemptWalletLoad();
        resolve(provider);
      } catch (error) {
        // If we used cached WIF and it failed, it might be from a different Google account
        // Clear WIF and retry with password prompt
        if (usedCachedWif && !usedPassword) {
          logger.info('Wallet load failed with cached WIF, clearing and retrying with password prompt');
          clearStoredEncryptionKeyWif();
          this.passwordPromise = undefined;
          usedCachedWif = false;

          try {
            const provider = await attemptWalletLoad();
            resolve(provider);
            return;
          } catch (retryError) {
            logger.error('Error in getWallet retry: %s', retryError instanceof Error ? retryError.message : String(retryError));
            reject(retryError);
            return;
          }
        }

        logger.error('Error in getWallet: %s', error instanceof Error ? error.message : String(error));
        reject(error);
      }
    });

    return this.walletInstance;
  }

  async signChallenge({ message }: SignChallenge): Promise<string> {
    const { username, keyType } = this;
    logger.info('in SignerGoogleDrive.signChallenge %o', { message, username, keyType });
    try {
      let provider: IExternalWalletContent;

      try {
        provider = await this.getWallet(username, keyType);
      } catch (error) {
        logger.error('Error obtaining Google Drive wallet: %s Retrying with forceLogin=true', error instanceof Error ? error.message : String(error));

        provider = await this.getWallet(username, keyType, true);
      }

      let pk: string | null = null;
      for(const key of provider.enumStoredHiveKeys(username, keyType)) {
        pk = key.publicKey;
        break;
      }
      if (!pk) {
        // Show error dialog with link to Hive Bridge
        const { GoogleDriveErrorDialogPromise } = await import('@smart-signer/components/google-drive-error-dialog');
        await GoogleDriveErrorDialogPromise({
          isOpen: true,
          errorType: 'key_not_found',
          username,
          keyType
        });
        // Dialog will reject if user closes it, but if we somehow get here, still throw
        throw new Error(`No stored Hive ${keyType} key found for user ${username} in Google Drive wallet`);
      }

      if (typeof message !== "string")
        message = await crypto.subtle.digest(
          "SHA-256",
          new Uint8Array(message as ArrayBuffer)
        );

      const signature = await provider.encryptData(message, pk);

      logger.info('google', { signature });
      return signature;
    } catch (error) {
      throw error;
    }
  }

  async signTransaction({ transaction, requiredKeyType }: SignTransaction): Promise<string> {
    try {
      const authTx = (await getChain()).createTransactionFromProto(transaction);

      let provider: IExternalWalletContent;

      try {
        provider = await this.getWallet(this.username, requiredKeyType ?? this.keyType);
      } catch (error) {
        logger.error('Error obtaining Google Drive wallet: %s Retrying with forceLogin=true', error instanceof Error ? error.message : String(error));

        provider = await this.getWallet(this.username, requiredKeyType ?? this.keyType, true);
      }

      await provider.signTransaction(authTx);

      await verifyAuthorityOrThrow(authTx.toApiJson(), TTransactionPackType.HF_26, this.keyType, 'Google Drive');
      logger.info('authTx.transaction.signatures: %o', authTx.transaction.signatures);
      return authTx.transaction.signatures[0];
    } catch (error) {
      logger.error('SignerGoogleDrive.signTransaction error: %s', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
}
