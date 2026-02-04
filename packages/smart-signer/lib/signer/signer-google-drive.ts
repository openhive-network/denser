import { SignChallenge, Signer, SignerOptions, SignTransaction } from '@smart-signer/lib/signer/signer';
import { THiveRoles, TTransactionPackType } from '@hiveio/wax';
import { siteConfig } from "@hive/ui/config/site";

import { getLogger } from '@hive/ui/lib/logging';
import { getChain } from '@transaction/lib/chain';
import { createExternalWallet, IExternalWallet, IExternalWalletContent } from '@hiveio/wax-signers-external';
import { PasswordFormMode, PasswordFormOptions } from '@smart-signer/components/password-form';
import { PasswordDialogModalPromise } from '@smart-signer/components/password-dialog';
import { getStorageItem, setStorageItem, removeStorageItem, StorageTTL } from '@hive/ui/lib/storage-with-ttl';

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
            include_granted_scopes?: boolean;
            callback: (response: { code?: string; }) => void;
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

    setStorageItem(GOOGLE_DRIVE_REFRESH_TOKEN_LOCALSTORAGE_KEY, refreshToken, StorageTTL.PERMANENT);

    return data.accessToken;
  }

  private getAccessToken(): Promise<string> {
    if (this._accessToken)
      return this._accessToken;

    if (!hasCompatibleGoogleDriveProvider()) {
      throw new Error('Google Drive Signer is not properly configured.');
    }

    const savedRefresh = getStorageItem<string>(GOOGLE_DRIVE_REFRESH_TOKEN_LOCALSTORAGE_KEY);
    if (savedRefresh) {
      this._accessToken = this.getAccessTokenForRefreshToken(savedRefresh).catch((err) => {
        logger.error({ err }, 'Error refreshing Google Drive access token');

        removeStorageItem(GOOGLE_DRIVE_REFRESH_TOKEN_LOCALSTORAGE_KEY);

        this.destroy().catch(() => {});

        throw err;
      });

      if (!this._accessToken) {
        throw new Error('Failed to refresh access token');
      }
      return this._accessToken;
    }

    this._accessToken = new Promise<string>((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initCodeClient({
        client_id: siteConfig.googleDrive.clientId,
        scope: siteConfig.googleDrive.scopes,
        ux_mode: 'popup',
        include_granted_scopes: false,
        callback: async (response: any) => {
          try {
            const code = response.code as string;

            if (typeof code !== 'string') {
              reject(new Error('No code received from Google Drive OAuth2'));
              return;
            }

            if (code) {
              const res = await fetch(`${window.location.origin}/api/google-drive/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
              });

              if (!res.ok) {
                reject(new Error('Failed to exchange code for tokens'));
                return;
              }

              const data = await res.json();

              if (data.refreshToken) {
                setStorageItem(GOOGLE_DRIVE_REFRESH_TOKEN_LOCALSTORAGE_KEY, data.refreshToken, StorageTTL.PERMANENT);
              }

              resolve(data.accessToken);
            }
          } catch (error) {
            reject(error);
          }
        }
      });

      tokenClient.requestCode({ prompt: 'consent' });
    });

    if (!this._accessToken) {
      throw new Error('Failed to initialize access token');
    }
    return this._accessToken;
  }

  async destroy(): Promise<void> {
    this._accessToken = undefined;
    this.passwordPromise = undefined;
    this.rawWallet = undefined;
    removeStorageItem(GOOGLE_DRIVE_REFRESH_TOKEN_LOCALSTORAGE_KEY);
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
      logger.error({ error }, 'Error in getEncryptionCredentials');
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
            logger.error({ error: wifError }, 'Failed to extract/cache encryption key WIF');
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
            logger.error({ error: retryError }, 'Error in getWallet retry');
            reject(retryError);
            return;
          }
        }

        logger.error({ error }, 'Error in getWallet');
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
        logger.error({ error }, 'Error obtaining Google Drive wallet - Retrying with forceLogin=true');

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

      logger.info({ signature }, 'google');
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
        logger.error({ error }, 'Error obtaining Google Drive wallet - Retrying with forceLogin=true');

        provider = await this.getWallet(this.username, requiredKeyType ?? this.keyType, true);
      }

      await provider.signTransaction(authTx);

      // This is quicker way to verify authority, isntead of
      // authority-checker.ts
      // we will use only this method to verify authority soon
      await (
        await getChain()
      ).api.database_api.verify_authority({
        trx: authTx.toApiJson(),
        pack: TTransactionPackType.HF_26
      });
      logger.info('authTx.transaction.signatures: %o', authTx.transaction.signatures);
      return authTx.transaction.signatures[0];
    } catch (error) {
      logger.error({ error }, 'SignerGoogleDrive.signTransaction error');
      throw error;
    }
  }
}
