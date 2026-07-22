'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { useGDWTranslation } from '../i18n/context';
import { toast } from '@ui/components/hooks/use-toast';
import { Button } from '@ui/components/button';
import { Separator } from '@ui/components/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/tabs';
import type { TRole } from '@smart-signer/lib/google-drive-wallet-manager';
import { useGoogleDriveWallet } from '../hooks/use-google-drive-wallet';
import { useGoogleDriveWalletStore } from '../store/google-drive-wallet-store';
import { AccountKeyList } from './account-key-list';
import { AddAccountDialog } from './add-account-dialog';
import { CreateWalletDialog } from './create-wallet-dialog';
import { CustomKeyList } from './custom-key-list';
import { DeleteWalletDialog } from './delete-wallet-dialog';
import { GoogleDriveConnectCard } from './google-drive-connect-card';
import { WalletEmptyState } from './wallet-empty-state';
import { WalletNeedsPassword } from './wallet-needs-password';

/**
 * Main orchestrator for Google Drive wallet key management.
 * Renders the appropriate UI based on authentication and wallet state,
 * delegating all async logic to the `useGoogleDriveWallet` hook.
 */
export function GoogleDriveKeyManager() {
  const { t } = useGDWTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const {
    isAuthenticated, isLoading, hasWalletFile, isWalletLoaded,
    storedAccounts, activeAccountTab, accountRoles, accountPublicKeys,
    customKeys, needsPassword, setActiveAccountTab,
    checkAuthentication, connectGoogleDrive, loadWalletInfo,
    loadWalletWithPassword, addAccount, removeAccount,
    addKeyToAccount, removeKeyFromAccount, createNewWallet,
    deleteWallet, addCustomKey, removeCustomKey
  } = useGoogleDriveWallet();

  const [isInitializing, setIsInitializing] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // --- Lifecycle: check auth, handle OAuth callback, load wallet ---
  useEffect(() => {
    async function init() {
      try {
        if (searchParams?.get('auth') === 'success') {
          router.replace(pathname ?? '/', { scroll: false });
        }
        await checkAuthentication();
        if (useGoogleDriveWalletStore.getState().isAuthenticated) {
          await loadWalletInfo();
        }
      } catch {
        // loadWalletInfo may throw when wallet needs password —
        // store state (hasWalletFile, needsPassword) is already set before the throw
      } finally {
        setIsInitializing(false);
      }
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Handlers ---

  async function handleConnect() {
    try {
      await connectGoogleDrive();
      await loadWalletInfo();
    } catch {
      toast({ title: t('google_drive_wallet.toast.connect_failed'), variant: 'destructive' });
    }
  }

  async function handleLoadKeys(password: string) {
    try {
      await loadWalletWithPassword(password);
      toast({ title: t('google_drive_wallet.toast.keys_loaded'), variant: 'success' });
    } catch {
      toast({ title: t('google_drive_wallet.toast.invalid_password'), variant: 'destructive' });
    }
  }

  async function handleCreateWallet(
    password: string, accountName: string, keys: Partial<Record<TRole, string>>
  ) {
    await createNewWallet(password, accountName, keys);
    setActiveAccountTab(accountName);
    toast({ title: t('google_drive_wallet.toast.wallet_created'), variant: 'success' });
  }

  async function handleAccountAdded(name: string, role: TRole, key: string) {
    await addAccount(name, role, key);
    setActiveAccountTab(name);
    toast({ title: t('google_drive_wallet.toast.account_added'), variant: 'success' });
  }

  async function handleDeleteWallet() {
    await deleteWallet();
    setShowDeleteDialog(false);
    await checkAuthentication();
    // Re-probe wallet state so the store gets hasWalletFile: false
    // (not null from reset). Without this, no rendering branch matches
    // and the UI disappears (Bug #4).
    if (useGoogleDriveWalletStore.getState().isAuthenticated) {
      await loadWalletInfo();
    }
    toast({ title: t('google_drive_wallet.toast.wallet_deleted'), variant: 'success' });
  }

  // --- Conditional rendering (early returns for non-loaded states) ---

  if (isInitializing) {
    return <GoogleDriveConnectCard isInitializing onConnect={handleConnect} />;
  }
  if (!isAuthenticated) {
    return <GoogleDriveConnectCard isInitializing={false} onConnect={handleConnect} />;
  }
  if (hasWalletFile === false) {
    return (
      <>
        <WalletEmptyState hasWalletFile={false} onCreateWallet={() => setShowCreateDialog(true)} />
        <CreateWalletDialog
          open={showCreateDialog} onOpenChange={setShowCreateDialog}
          onCreateWallet={handleCreateWallet} onAddKeys={addKeyToAccount}
        />
      </>
    );
  }
  if (needsPassword) {
    return <WalletNeedsPassword onLoadKeys={handleLoadKeys} isLoading={isLoading} />;
  }
  if (isWalletLoaded && storedAccounts.length === 0) {
    return (
      <>
        <WalletEmptyState hasWalletFile onCreateWallet={() => setShowAddAccountDialog(true)} />
        <AddAccountDialog
          open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}
          onAccountAdded={handleAccountAdded}
        />
      </>
    );
  }
  if (!isWalletLoaded) return null;

  // --- Full wallet UI ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="py-4 text-lg font-semibold leading-5">
          {t('google_drive_wallet.manager.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('google_drive_wallet.manager.description')}
        </p>
      </div>

      {/* Account tabs */}
      <Tabs value={activeAccountTab} onValueChange={setActiveAccountTab}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <TabsList className="flex-1 overflow-x-auto sm:flex-none">
            {storedAccounts.map((account) => (
              <TabsTrigger key={account} value={account}>@{account}</TabsTrigger>
            ))}
          </TabsList>
          <Button variant="outline" size="sm" className="shrink-0"
            onClick={() => setShowAddAccountDialog(true)}>
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">{t('google_drive_wallet.manager.add_account')}</span>
          </Button>
        </div>
        {storedAccounts.map((account) => (
          <TabsContent key={account} value={account}>
            <AccountKeyList
              accountName={account}
              configuredRoles={accountRoles[account] ?? []}
              rolePublicKeys={accountPublicKeys[account] ?? {}}
              isLoadingKeys={isLoading}
              onAddKey={async (role, key) => {
                await addKeyToAccount(account, role, key);
                toast({ title: t('google_drive_wallet.toast.key_added'), variant: 'success' });
              }}
              onRemoveKey={async (role) => {
                await removeKeyFromAccount(account, role);
                toast({ title: t('google_drive_wallet.toast.key_removed'), variant: 'success' });
              }}
              onRemoveAccount={async () => {
                await removeAccount(account);
                toast({ title: t('google_drive_wallet.toast.account_removed'), variant: 'success' });
              }}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Custom keys */}
      <CustomKeyList
        customKeys={customKeys}
        onAddCustomKey={async (alias, key, desc) => {
          await addCustomKey(alias, key, desc);
          toast({ title: t('google_drive_wallet.toast.custom_key_added'), variant: 'success' });
        }}
        onRemoveCustomKey={async (alias) => {
          await removeCustomKey(alias);
          toast({ title: t('google_drive_wallet.toast.custom_key_removed'), variant: 'success' });
        }}
      />

      {/* About Wallet Keys */}
      <div className="hidden rounded-lg bg-muted p-3 text-xs text-muted-foreground sm:block">
        <p className="mb-1 font-medium">{t('google_drive_wallet.manager.about_title')}</p>
        <ul className="list-inside list-disc space-y-1">
          <li><strong>{t('google_drive_wallet.roles.posting')}:</strong> {t('google_drive_wallet.roles.posting_short')}</li>
          <li><strong>{t('google_drive_wallet.roles.active')}:</strong> {t('google_drive_wallet.roles.active_short')}</li>
          <li><strong>{t('google_drive_wallet.roles.owner')}:</strong> {t('google_drive_wallet.roles.owner_short')}</li>
          <li><strong>{t('google_drive_wallet.roles.memo')}:</strong> {t('google_drive_wallet.roles.memo_short')}</li>
        </ul>
      </div>

      <Separator />

      {/* Delete Wallet */}
      <div className="py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{t('google_drive_wallet.manager.delete_title')}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('google_drive_wallet.manager.delete_description')}</p>
          </div>
          <Button variant="destructive" size="sm" className="shrink-0"
            onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-1 h-4 w-4" />
            {t('google_drive_wallet.manager.delete_button')}
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <AddAccountDialog
        open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}
        onAccountAdded={handleAccountAdded}
      />
      <DeleteWalletDialog
        open={showDeleteDialog} onOpenChange={setShowDeleteDialog}
        onConfirmDelete={handleDeleteWallet}
      />
    </div>
  );
}
