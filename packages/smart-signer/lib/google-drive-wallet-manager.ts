import { THiveRoles, TRole } from '@hiveio/wax';
import {
  createExternalWallet,
  IExternalWallet,
  IExternalWalletContent
} from '@hiveio/wax-signers-external';
import { siteConfig } from '@hive/ui/config/site';
import { getLogger } from '@hive/ui/lib/logging';
import { getChain } from '@transaction/lib/chain';
import { PasswordFormMode, PasswordFormOptions } from '@smart-signer/components/password-form';
import { PasswordDialogModalPromise } from '@smart-signer/components/password-dialog';
import { GoogleDriveAuth } from '@smart-signer/lib/google-drive-auth';

export { hasCompatibleGoogleDriveProvider } from '@smart-signer/lib/google-drive-auth';

const logger = getLogger('app');

// --- Constants ---

const ENCRYPTION_KEY_WIF_KEY = 'gdrive_encryption_key_wif';

// --- Exported types ---

export type { TRole } from '@hiveio/wax';

export interface CustomKey {
  alias: string;
  publicKey: string;
  description?: string;
}

// --- Encryption key helpers (permanent storage, WIF alone can't access wallet) ---

/* eslint-disable no-restricted-properties */
function getStoredEncryptionKeyWif(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ENCRYPTION_KEY_WIF_KEY);
}
function setStoredEncryptionKeyWif(wif: string): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(ENCRYPTION_KEY_WIF_KEY, wif);
}
function clearStoredEncryptionKeyWif(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(ENCRYPTION_KEY_WIF_KEY);
}
/* eslint-enable no-restricted-properties */

// --- Internal error types for checkWalletFileExists ---

class WalletFileNotFoundError extends Error {
  constructor() { super('Wallet file not found'); this.name = 'WalletFileNotFoundError'; }
}
class WalletLockedError extends Error {
  constructor() { super('Wallet exists but locked'); this.name = 'WalletLockedError'; }
}

// --- Manager ---

/**
 * Singleton managing the Google Drive wallet lifecycle: authentication,
 * wallet instance caching, encryption credentials and CRUD operations
 * on Hive keys and custom keys stored in the wallet file.
 *
 * Delegates OAuth/token management to {@link GoogleDriveAuth}.
 */
export class GoogleDriveWalletManager {
  private static instance: GoogleDriveWalletManager;
  private auth = GoogleDriveAuth.getInstance();
  private walletInstance: IExternalWallet | null = null;
  private passwordPromise: Promise<{ password: string }> | null = null;
  private presetPassword: string | null = null;
  private pendingCreationPassword: string | null = null;
  private lastCredentialType: 'cachedWif' | 'password' | null = null;

  private constructor() {}

  static getInstance(): GoogleDriveWalletManager {
    if (!GoogleDriveWalletManager.instance) {
      GoogleDriveWalletManager.instance = new GoogleDriveWalletManager();
    }
    return GoogleDriveWalletManager.instance;
  }

  // ---- Auth delegation ----

  checkAuth(): boolean { return this.auth.checkAuth(); }

  async resetAuth(): Promise<void> {
    this.auth.resetTokens();
    this.passwordPromise = null;
    this.lastCredentialType = null;
    await this.resetWalletInstance();
  }

  // ---- Encryption credentials ----

  hasEncryptionKey(): boolean { return !!getStoredEncryptionKeyWif(); }
  setEncryptionKeyWif(wif: string): void { setStoredEncryptionKeyWif(wif); }
  clearEncryptionKeyWif(): void { clearStoredEncryptionKeyWif(); }

  private async getEncryptionCredentials(): Promise<{ password: string } | { encryptionKey: string }> {
    const cachedWif = getStoredEncryptionKeyWif();
    if (cachedWif) {
      logger.info('Using cached encryption key WIF for Google Drive wallet');
      return { encryptionKey: cachedWif };
    }

    const passwordFormOptions: PasswordFormOptions = {
      mode: PasswordFormMode.HBAUTH,
      showInputStorePassword: false,
      i18nKeysForCaptions: { inputPasswordPlaceholder: 'Password to unlock Google Drive wallet' }
    };

    try {
      if (!this.passwordPromise) {
        this.passwordPromise = PasswordDialogModalPromise({ isOpen: true, passwordFormOptions });
      }
      return await this.passwordPromise;
    } catch (promptError) {
      logger.error('Error in getEncryptionCredentials: %s',
        promptError instanceof Error ? promptError.message : String(promptError));
      throw new Error('No password from user');
    }
  }

  private tryCacheEncryptionKeyWif(wallet: IExternalWallet): void {
    if (this.hasEncryptionKey()) return;
    try {
      setStoredEncryptionKeyWif(wallet.getEncryptionKeyWif());
      logger.info('Cached encryption key WIF for Google Drive wallet');
    } catch (wifError) {
      logger.error('Failed to cache encryption key WIF: %s',
        wifError instanceof Error ? wifError.message : String(wifError));
    }
  }

  // ---- Wallet instance ----

  private async handlePasswordRequest(
    missingStorageFile: boolean
  ): Promise<{ password: string } | { encryptionKey: string }> {
    if (missingStorageFile && this.pendingCreationPassword) {
      return { password: this.pendingCreationPassword };
    }
    if (missingStorageFile) {
      const { GoogleDriveErrorDialogPromise } = await import('@smart-signer/components/google-drive-error-dialog');
      await GoogleDriveErrorDialogPromise({ isOpen: true, errorType: 'wallet_not_found' });
      throw new Error('Google Drive wallet file not found');
    }
    if (this.presetPassword) {
      this.lastCredentialType = 'password';
      return { password: this.presetPassword };
    }
    const credentials = await this.getEncryptionCredentials();
    this.lastCredentialType = 'encryptionKey' in credentials ? 'cachedWif' : 'password';
    return credentials;
  }

  private async ensureWallet(): Promise<IExternalWallet> {
    if (this.walletInstance) return this.walletInstance;
    this.walletInstance = await createExternalWallet(
      await getChain(),
      () => this.auth.getAccessToken(),
      (missing) => this.handlePasswordRequest(missing),
      siteConfig.googleDrive.walletFileName
    );
    return this.walletInstance;
  }

  private async resetWalletInstance(): Promise<void> {
    if (this.walletInstance) {
      try { await this.walletInstance.close(); } catch { /* close errors non-fatal */ }
      this.walletInstance = null;
    }
  }

  // ---- Core wallet operations ----

  async loadWalletForKey(
    username: string,
    keyType: keyof THiveRoles,
    forceReauth = false
  ): Promise<IExternalWalletContent> {
    if (forceReauth) {
      await this.resetAuth();
      clearStoredEncryptionKeyWif();
    }

    this.auth.setOAuthContext({ username, keyType });
    this.lastCredentialType = null;
    this.passwordPromise = null;
    await this.resetWalletInstance();

    const attemptLoad = async (): Promise<IExternalWalletContent> => {
      const wallet = await this.ensureWallet();
      const walletContent = await wallet.loadForHiveKey(username, keyType);
      if (this.lastCredentialType === 'password') this.tryCacheEncryptionKeyWif(wallet);
      return walletContent;
    };

    try {
      return await attemptLoad();
    } catch (loadError) {
      if (this.lastCredentialType === 'cachedWif') {
        logger.info('Wallet load failed with cached WIF, retrying with password prompt');
        clearStoredEncryptionKeyWif();
        this.passwordPromise = null;
        this.lastCredentialType = null;
        await this.resetWalletInstance();
        return await attemptLoad();
      }
      throw loadError;
    }
  }

  async loadWallet(password?: string): Promise<void> {
    if (password) this.presetPassword = password;
    try {
      this.passwordPromise = null;
      await this.resetWalletInstance();
      const wallet = await this.ensureWallet();
      await wallet.enumStoredAccounts();
      this.tryCacheEncryptionKeyWif(wallet);
    } finally {
      this.presetPassword = null;
    }
  }

  // ---- Account & key CRUD ----

  async getStoredAccounts(): Promise<string[]> {
    const wallet = await this.ensureWallet();
    this.tryCacheEncryptionKeyWif(wallet);
    return await wallet.enumStoredAccounts();
  }

  async getAllConfiguredRoles(accountName: string): Promise<TRole[]> {
    const wallet = await this.ensureWallet();
    return await wallet.enumStoredRolesForAccount(accountName);
  }

  async getPublicKeyForRole(accountName: string, role: TRole): Promise<string | null> {
    try {
      const wallet = await this.ensureWallet();
      const walletContent = await wallet.loadForHiveKey(accountName, role);
      const keyInfo = [...walletContent.enumStoredHiveKeys(accountName, role)][0];
      this.tryCacheEncryptionKeyWif(wallet);
      return keyInfo?.publicKey ?? null;
    } catch {
      return null;
    }
  }

  async addKey(accountName: string, role: TRole, privateKey: string): Promise<void> {
    const wallet = await this.ensureWallet();
    await wallet.createForHiveKey(role, accountName, privateKey);
    this.tryCacheEncryptionKeyWif(wallet);
  }

  async removeKey(accountName: string, role: TRole): Promise<void> {
    const wallet = await this.ensureWallet();
    const walletContent = await wallet.loadForHiveKey(accountName, role);
    const keyInfo = [...walletContent.enumStoredHiveKeys(accountName, role)][0];
    if (!keyInfo) throw new Error(`No key found for ${accountName}@${role}`);
    await walletContent.removeKey(keyInfo);
  }

  // ---- Wallet creation & deletion ----

  async createWallet(
    password: string,
    accountName: string,
    keys: Partial<Record<TRole, string>>
  ): Promise<void> {
    this.pendingCreationPassword = password;
    await this.resetWalletInstance();
    try {
      const wallet = await this.ensureWallet();
      for (const [role, privateKey] of Object.entries(keys)) {
        if (privateKey) await wallet.createForHiveKey(role as TRole, accountName, privateKey);
      }
      this.tryCacheEncryptionKeyWif(wallet);
    } finally {
      this.pendingCreationPassword = null;
    }
  }

  async deleteWalletFile(): Promise<void> {
    const wallet = await this.ensureWallet();
    const walletWithDelete = wallet as IExternalWallet & { deleteStorageFile?: () => Promise<void> };
    if (!walletWithDelete.deleteStorageFile) {
      throw new Error('deleteStorageFile is not supported by the current @hiveio/wax-signers-external version');
    }
    await walletWithDelete.deleteStorageFile();
    await this.resetWalletInstance();
    clearStoredEncryptionKeyWif();
  }

  async checkWalletFileExists(): Promise<boolean> {
    try {
      const probeWallet = await createExternalWallet(
        await getChain(),
        () => this.auth.getAccessToken(),
        async (missingStorageFile) => {
          if (missingStorageFile) throw new WalletFileNotFoundError();
          const cachedWif = getStoredEncryptionKeyWif();
          if (cachedWif) return { encryptionKey: cachedWif };
          throw new WalletLockedError();
        },
        siteConfig.googleDrive.walletFileName
      );
      await probeWallet.enumStoredAccounts();
      await probeWallet.close();
      return true;
    } catch (probeError) {
      if (probeError instanceof WalletFileNotFoundError) return false;
      if (probeError instanceof WalletLockedError) return true;
      throw probeError;
    }
  }

  // ---- Custom keys ----

  async addCustomKey(alias: string, privateKey: string, description?: string): Promise<void> {
    const wallet = await this.ensureWallet();
    await wallet.createForCustomKey(alias, privateKey, description);
    this.tryCacheEncryptionKeyWif(wallet);
  }

  async getAllCustomKeys(): Promise<CustomKey[]> {
    const wallet = await this.ensureWallet();
    const sdkKeys = [...(await wallet.enumStoredCustomKeys())];
    return sdkKeys.map((sdkKey) => ({
      alias: sdkKey.customAlias,
      publicKey: sdkKey.publicKey,
      description: sdkKey.description
    }));
  }

  async removeCustomKey(alias: string): Promise<void> {
    const wallet = await this.ensureWallet();
    const walletContent = await wallet.loadForCustomKey(alias);
    const keyInfo = [...walletContent.enumStoredCustomKeys()].find((k) => k.customAlias === alias);
    if (!keyInfo) throw new Error(`Custom key '${alias}' not found`);
    await walletContent.removeKey(keyInfo);
  }
}

export const googleDriveWalletManager = GoogleDriveWalletManager.getInstance();
