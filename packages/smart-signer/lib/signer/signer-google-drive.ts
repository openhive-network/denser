import { SignChallenge, Signer, SignerOptions, SignTransaction } from '@smart-signer/lib/signer/signer';
import { THiveRoles, TTransactionPackType } from '@hiveio/wax';
import { siteConfig } from "@hive/ui/config/site";

import { getLogger } from '@hive/ui/lib/logging';
import { getChain } from '@transaction/lib/chain';
import { createExternalWallet, IExternalWalletContent } from '@hiveio/wax-signers-external';
import { PasswordFormMode, PasswordFormOptions } from '@smart-signer/components/password-form';
import { PasswordDialogModalPromise } from '@smart-signer/components/password-dialog';

const logger = getLogger('app');

export const hasCompatibleGoogleDriveProvider = () => !!siteConfig.googleDrive.clientId;

const GOOGLE_DRIVE_REFRESH_TOKEN_LOCALSTORAGE_KEY = 'google_refresh_token';
const GOOGLE_DRIVE_PASSWORD_LOCALSTORAGE_KEY = 'gdrive_signer_password';

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initCodeClient(config: {
            client_id: string;
            scope: string;
            ux_mode: 'popup' | 'redirect';
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
  private _accessToken?: Promise<string>;
  private passwordPromise?: Promise<{ password: string }>;
  private currentKeyType?: keyof THiveRoles;

  private getAccessTokenForRefreshToken = async (refreshToken: string): Promise<string> => {
    const response = await fetch(`${siteConfig.url}/api/google-drive/refresh`, {
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

    const savedRefresh = localStorage.getItem(GOOGLE_DRIVE_REFRESH_TOKEN_LOCALSTORAGE_KEY);
    if (savedRefresh) {
      this._accessToken = this.getAccessTokenForRefreshToken(savedRefresh).catch((err) => {
        logger.error('Error refreshing Google Drive access token: %o', err);

        localStorage.removeItem(GOOGLE_DRIVE_REFRESH_TOKEN_LOCALSTORAGE_KEY);

        this.destroy().catch(() => {});

        throw err;
      });

      return this._accessToken!;
    }

    this._accessToken = new Promise<string>((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initCodeClient({
        client_id: siteConfig.googleDrive.clientId,
        scope: siteConfig.googleDrive.scopes,
        ux_mode: 'popup',
        callback: async (response: any) => {
          try {
            const code = response.code as string;

            if (typeof code !== 'string') {
              reject(new Error('No code received from Google Drive OAuth2'));
              return;
            }

            if (code) {
              const res = await fetch(`${siteConfig.url}/api/google-drive/auth`, {
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
                localStorage.setItem(GOOGLE_DRIVE_REFRESH_TOKEN_LOCALSTORAGE_KEY, data.refreshToken);
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

    return this._accessToken!;
  }

  async destroy(): Promise<void> {
    this._accessToken = undefined;
    this.passwordPromise = undefined;
    localStorage.removeItem(GOOGLE_DRIVE_REFRESH_TOKEN_LOCALSTORAGE_KEY);
    localStorage.removeItem(GOOGLE_DRIVE_PASSWORD_LOCALSTORAGE_KEY);
  }

  private async getPasswordFromUser(): Promise<string> {
    const password = localStorage.getItem(GOOGLE_DRIVE_PASSWORD_LOCALSTORAGE_KEY);
    if (password) {
      return password;
    }

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

      localStorage.setItem(GOOGLE_DRIVE_PASSWORD_LOCALSTORAGE_KEY, password);

      return password;
    } catch (error) {
      logger.error('Error in getPasswordFromUser: %o', error);
      throw new Error('No password from user');
    }
  }

  private getWallet(username: string, keyType: keyof THiveRoles, forceLogin = false): Promise<IExternalWalletContent> {
    if (forceLogin || (this.currentKeyType && keyType !== this.currentKeyType)) {
      this.walletInstance = undefined;
      this._accessToken = undefined;
      this.passwordPromise = undefined;
      localStorage.removeItem(GOOGLE_DRIVE_PASSWORD_LOCALSTORAGE_KEY);
    }

    if (this.walletInstance)
      return this.walletInstance;

    this.walletInstance = new Promise<IExternalWalletContent>(async (resolve, reject) => {
      try {
        const wallet = await createExternalWallet(
          await getChain(),
          () => this.getAccessToken(),
          async (missingStorageFile) => {
            if (missingStorageFile) {
              throw new Error('Google Drive wallet file not found. Please create your wallet first at Hive Bridge.');
            }

            const password = await this.getPasswordFromUser();

            return { password };
          },
          siteConfig.googleDrive.walletFileName
        );

        // Store a key
        const provider = await wallet.loadForHiveKey(username, keyType);

        logger.info('Obtained Google Drive wallet for user %s with key type %s : %s', username, keyType, provider.enumStoredHiveKeys(username, keyType));

        this.currentKeyType = keyType;

        resolve(provider);
      } catch (error) {
        logger.error('Error in getWallet: %o', error);
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
        logger.error('Error obtaining Google Drive wallet: %o Retrying with forceLogin=true', error);

        provider = await this.getWallet(username, keyType, true);
      }

      let pk: string | null = null;
      for(const key of provider.enumStoredHiveKeys(username, keyType)) {
        pk = key.publicKey;
        break;
      }
      if (!pk) {
        throw new Error(`No stored Hive ${keyType} key found for user ${username} in Google Drive wallet`);
      }

      const signature = await provider.encryptData(typeof message === "string" ? message : JSON.stringify(message), pk);

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
        logger.error('Error obtaining Google Drive wallet: %o Retrying with forceLogin=true', error);

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
      console.log('authTx.transaction.signatures', authTx.transaction.signatures);
      return authTx.transaction.signatures[0];
    } catch (error) {
      logger.error('SignerGoogleDrive.signTransaction error: %o', error);
      throw error;
    }
  }
}
