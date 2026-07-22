import { getLogger } from '@ui/lib/logging';
import { googleDriveWalletManager } from '@smart-signer/lib/google-drive-wallet-manager';
import { GoogleDriveAuth } from '@smart-signer/lib/google-drive-auth';
import type { TRole } from '@smart-signer/lib/google-drive-wallet-manager';
import { useGoogleDriveWalletStore } from '../store/google-drive-wallet-store';

const logger = getLogger('app');

/** All Hive authority roles for exhaustive key enumeration. */
const HIVE_ROLES: TRole[] = ['owner', 'active', 'posting', 'memo'];

// ---------------------------------------------------------------------------
// Internal helper -- loads accounts, roles, public keys and custom keys
// from the wallet into the Zustand store. Assumes the wallet is already
// accessible (authenticated + unlocked).
// ---------------------------------------------------------------------------

async function refreshWalletData(): Promise<void> {
  const {
    updateAccountRoles,
    updateAccountPublicKeys,
    setCustomKeys,
    setWalletState,
    setActiveAccountTab
  } = useGoogleDriveWalletStore.getState();

  const accounts = await googleDriveWalletManager.getStoredAccounts();

  for (const account of accounts) {
    const roles = await googleDriveWalletManager.getAllConfiguredRoles(account);
    updateAccountRoles(account, roles);

    const keyMap = {} as Record<TRole, string | null>;
    for (const role of HIVE_ROLES) {
      keyMap[role] = roles.includes(role)
        ? await googleDriveWalletManager.getPublicKeyForRole(account, role)
        : null;
    }
    updateAccountPublicKeys(account, keyMap);
  }

  const customKeys = await googleDriveWalletManager.getAllCustomKeys();
  setCustomKeys(customKeys);

  setWalletState({
    hasWalletFile: true,
    isWalletLoaded: true,
    storedAccounts: accounts,
    needsPassword: false
  });

  // Default to the first account if none is selected yet
  const { activeAccountTab } = useGoogleDriveWalletStore.getState();
  if (accounts.length > 0 && !activeAccountTab) {
    setActiveAccountTab(accounts[0]);
  }
}

// ---------------------------------------------------------------------------
// Module-level async actions -- stable references, access store via getState()
// ---------------------------------------------------------------------------

async function checkAuthentication(): Promise<void> {
  const isAuth = googleDriveWalletManager.checkAuth();
  useGoogleDriveWalletStore.getState().setAuthenticated(isAuth);
}

async function connectGoogleDrive(): Promise<void> {
  useGoogleDriveWalletStore.getState().setLoading(true);
  try {
    const auth = GoogleDriveAuth.getInstance();
    await auth.getAccessToken();
    useGoogleDriveWalletStore.getState().setAuthenticated(true);
  } catch (error) {
    logger.error('Failed to connect Google Drive: %s', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    useGoogleDriveWalletStore.getState().setLoading(false);
  }
}

async function disconnectGoogleDrive(): Promise<void> {
  useGoogleDriveWalletStore.getState().setLoading(true);
  try {
    await googleDriveWalletManager.resetAuth();
    googleDriveWalletManager.clearEncryptionKeyWif();
    useGoogleDriveWalletStore.getState().reset();
  } catch (error) {
    logger.error('Failed to disconnect Google Drive: %s', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    useGoogleDriveWalletStore.getState().setLoading(false);
  }
}

async function loadWalletInfo(): Promise<void> {
  useGoogleDriveWalletStore.getState().setLoading(true);
  try {
    const walletExists = await googleDriveWalletManager.checkWalletFileExists();
    if (!walletExists) {
      useGoogleDriveWalletStore.getState().setWalletState({
        hasWalletFile: false,
        isWalletLoaded: false,
        storedAccounts: [],
        needsPassword: false
      });
      return;
    }

    const needsUnlock = !googleDriveWalletManager.hasEncryptionKey();
    useGoogleDriveWalletStore.getState().setWalletState({
      hasWalletFile: true,
      needsPassword: needsUnlock
    });

    // If the wallet is locked, stop here — the user must enter the password
    // via the WalletNeedsPassword UI. Calling refreshWalletData() without the
    // encryption key would trigger the manager's built-in system password
    // modal, resulting in a double-prompt (Bug #5).
    if (needsUnlock) {
      return;
    }

    await refreshWalletData();
  } catch (error) {
    logger.error('Failed to load wallet info: %s', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    useGoogleDriveWalletStore.getState().setLoading(false);
  }
}

async function loadWalletWithPassword(password: string): Promise<void> {
  useGoogleDriveWalletStore.getState().setLoading(true);
  try {
    await googleDriveWalletManager.loadWallet(password);
    await refreshWalletData();
  } catch (error) {
    logger.error('Failed to load wallet with password: %s', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    useGoogleDriveWalletStore.getState().setLoading(false);
  }
}

async function addAccount(name: string, role: TRole, privateKey: string): Promise<void> {
  useGoogleDriveWalletStore.getState().setLoading(true);
  try {
    await googleDriveWalletManager.addKey(name, role, privateKey);
    await refreshWalletData();
  } catch (error) {
    logger.error('Failed to add account %s: %s', name, error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    useGoogleDriveWalletStore.getState().setLoading(false);
  }
}

async function removeAccount(name: string): Promise<void> {
  useGoogleDriveWalletStore.getState().setLoading(true);
  try {
    const roles = await googleDriveWalletManager.getAllConfiguredRoles(name);
    for (const role of roles) {
      await googleDriveWalletManager.removeKey(name, role);
    }
    await refreshWalletData();
  } catch (error) {
    logger.error('Failed to remove account %s: %s', name, error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    useGoogleDriveWalletStore.getState().setLoading(false);
  }
}

async function addKeyToAccount(account: string, role: TRole, key: string): Promise<void> {
  useGoogleDriveWalletStore.getState().setLoading(true);
  try {
    await googleDriveWalletManager.addKey(account, role, key);
    await refreshWalletData();
  } catch (error) {
    logger.error('Failed to add key to %s@%s: %s', account, role, error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    useGoogleDriveWalletStore.getState().setLoading(false);
  }
}

async function removeKeyFromAccount(account: string, role: TRole): Promise<void> {
  useGoogleDriveWalletStore.getState().setLoading(true);
  try {
    await googleDriveWalletManager.removeKey(account, role);
    await refreshWalletData();
  } catch (error) {
    logger.error('Failed to remove key from %s@%s: %s', account, role, error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    useGoogleDriveWalletStore.getState().setLoading(false);
  }
}

async function createNewWallet(
  password: string,
  account: string,
  keys: Partial<Record<TRole, string>>
): Promise<void> {
  useGoogleDriveWalletStore.getState().setLoading(true);
  try {
    await googleDriveWalletManager.createWallet(password, account, keys);
    await refreshWalletData();
  } catch (error) {
    logger.error('Failed to create wallet: %s', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    useGoogleDriveWalletStore.getState().setLoading(false);
  }
}

async function deleteWallet(): Promise<void> {
  useGoogleDriveWalletStore.getState().setLoading(true);
  try {
    await googleDriveWalletManager.deleteWalletFile();
    useGoogleDriveWalletStore.getState().reset();
  } catch (error) {
    logger.error('Failed to delete wallet: %s', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    useGoogleDriveWalletStore.getState().setLoading(false);
  }
}

async function addCustomKeyAction(alias: string, key: string, description?: string): Promise<void> {
  useGoogleDriveWalletStore.getState().setLoading(true);
  try {
    await googleDriveWalletManager.addCustomKey(alias, key, description);
    const customKeys = await googleDriveWalletManager.getAllCustomKeys();
    useGoogleDriveWalletStore.getState().setCustomKeys(customKeys);
  } catch (error) {
    logger.error('Failed to add custom key %s: %s', alias, error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    useGoogleDriveWalletStore.getState().setLoading(false);
  }
}

async function removeCustomKeyAction(alias: string): Promise<void> {
  useGoogleDriveWalletStore.getState().setLoading(true);
  try {
    await googleDriveWalletManager.removeCustomKey(alias);
    const customKeys = await googleDriveWalletManager.getAllCustomKeys();
    useGoogleDriveWalletStore.getState().setCustomKeys(customKeys);
  } catch (error) {
    logger.error('Failed to remove custom key %s: %s', alias, error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    useGoogleDriveWalletStore.getState().setLoading(false);
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGoogleDriveWallet() {
  const {
    isAuthenticated,
    isLoading,
    hasWalletFile,
    isWalletLoaded,
    storedAccounts,
    activeAccountTab,
    accountRoles,
    accountPublicKeys,
    customKeys,
    needsPassword,
    setActiveAccountTab
  } = useGoogleDriveWalletStore();

  return {
    // State
    isAuthenticated,
    isLoading,
    hasWalletFile,
    isWalletLoaded,
    storedAccounts,
    activeAccountTab,
    accountRoles,
    accountPublicKeys,
    customKeys,
    needsPassword,

    // Store actions (pass-through)
    setActiveAccountTab,

    // Async actions
    checkAuthentication,
    connectGoogleDrive,
    disconnectGoogleDrive,
    loadWalletInfo,
    loadWalletWithPassword,
    addAccount,
    removeAccount,
    addKeyToAccount,
    removeKeyFromAccount,
    createNewWallet,
    deleteWallet,
    addCustomKey: addCustomKeyAction,
    removeCustomKey: removeCustomKeyAction,
    reloadWalletInfo: loadWalletInfo
  };
}
