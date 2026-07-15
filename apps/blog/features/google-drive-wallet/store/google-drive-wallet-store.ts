import { create } from 'zustand';
import { mountStoreDevtool } from 'simple-zustand-devtools';
import type { TRole, CustomKey } from '@smart-signer/lib/google-drive-wallet-manager';

// --- Types ---

export interface WalletStateUpdate {
  hasWalletFile: boolean | null;
  isWalletLoaded: boolean;
  storedAccounts: string[];
  needsPassword: boolean;
}

interface GoogleDriveWalletData {
  isAuthenticated: boolean;
  isLoading: boolean;
  hasWalletFile: boolean | null;
  isWalletLoaded: boolean;
  storedAccounts: string[];
  activeAccountTab: string;
  accountRoles: Record<string, TRole[]>;
  accountPublicKeys: Record<string, Record<TRole, string | null>>;
  customKeys: CustomKey[];
  needsPassword: boolean;
}

interface GoogleDriveWalletActions {
  setAuthenticated: (authenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setWalletState: (update: Partial<WalletStateUpdate>) => void;
  setActiveAccountTab: (tab: string) => void;
  updateAccountRoles: (account: string, roles: TRole[]) => void;
  updateAccountPublicKeys: (account: string, keys: Record<TRole, string | null>) => void;
  setCustomKeys: (keys: CustomKey[]) => void;
  reset: () => void;
}

export type GoogleDriveWalletState = GoogleDriveWalletData & GoogleDriveWalletActions;

// --- Initial state ---

const initialState: GoogleDriveWalletData = {
  isAuthenticated: false,
  isLoading: false,
  hasWalletFile: null,
  isWalletLoaded: false,
  storedAccounts: [],
  activeAccountTab: '',
  accountRoles: {},
  accountPublicKeys: {},
  customKeys: [],
  needsPassword: false
};

// --- Store ---

export const useGoogleDriveWalletStore = create<GoogleDriveWalletState>((set) => ({
  ...initialState,

  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setLoading: (isLoading) => set({ isLoading }),
  setWalletState: (update) => set(() => ({ ...update })),
  setActiveAccountTab: (activeAccountTab) => set({ activeAccountTab }),
  updateAccountRoles: (account, roles) =>
    set((state) => ({
      accountRoles: { ...state.accountRoles, [account]: roles }
    })),
  updateAccountPublicKeys: (account, keys) =>
    set((state) => ({
      accountPublicKeys: { ...state.accountPublicKeys, [account]: keys }
    })),
  setCustomKeys: (customKeys) => set({ customKeys }),
  reset: () => set(initialState)
}));

if (process.env.NODE_ENV === 'development') {
  mountStoreDevtool('GoogleDriveWalletStore', useGoogleDriveWalletStore);
}
