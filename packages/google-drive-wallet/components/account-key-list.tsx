'use client';

import { useState } from 'react';
import { Check, Key, Loader2, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle
} from '@ui/components/dialog';
import { toast } from '@ui/components/hooks/use-toast';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Badge } from '@ui/components/badge';
import { useGDWTranslation } from '../i18n/context';
import type { TRole } from '@smart-signer/lib/google-drive-wallet-manager';

const ALL_ROLES: TRole[] = ['posting', 'active', 'owner', 'memo'];

const ROLE_DESC_KEYS: Record<TRole, string> = {
  posting: 'google_drive_wallet.roles.posting_desc',
  active: 'google_drive_wallet.roles.active_desc',
  owner: 'google_drive_wallet.roles.owner_desc',
  memo: 'google_drive_wallet.roles.memo_desc'
};

export interface AccountKeyListProps {
  accountName: string;
  configuredRoles: TRole[];
  rolePublicKeys: Record<string, string | null>;
  isLoadingKeys: boolean;
  onAddKey: (role: TRole, privateKey: string) => Promise<void>;
  onRemoveKey: (role: TRole) => Promise<void>;
  onRemoveAccount: () => Promise<void>;
}

function truncateKey(key: string | null): string {
  if (!key || key.length <= 20) return key ?? '';
  return `${key.slice(0, 10)}...${key.slice(-8)}`;
}

function AddKeyDialog({ role, open, onOpenChange, onSubmit }: {
  role: TRole | null; open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (role: TRole, key: string) => Promise<void>;
}) {
  const { t } = useGDWTranslation();
  const [privateKey, setPrivateKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => { setPrivateKey(''); setShowKey(false); onOpenChange(false); };
  const handleSubmit = async () => {
    if (!role || !privateKey.trim()) return;
    setIsSaving(true);
    try {
      await onSubmit(role, privateKey.trim());
      handleClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('google_drive_wallet.toast.error'),
        description: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t('google_drive_wallet.add_role_key', { role })}
          </DialogTitle>
          <DialogDescription>{role ? t(ROLE_DESC_KEYS[role]) : ''}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <label htmlFor="gdw-private-key" className="text-sm font-medium">
            {t('google_drive_wallet.private_key')}
          </label>
          <div className="relative">
            <Input
              id="gdw-private-key"
              type={showKey ? 'text' : 'password'}
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder={t('google_drive_wallet.enter_private_key')}
              autoComplete="off"
              className="pr-10"
            />
            <Button
              variant="ghost" size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowKey((v) => !v)}
            >
              {showKey
                ? <EyeOff className="h-4 w-4 text-muted-foreground" />
                : <Eye className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('google_drive_wallet.key_security_notice')}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={isSaving} onClick={handleClose}>
            {t('google_drive_wallet.cancel')}
          </Button>
          <Button disabled={!privateKey.trim() || isSaving} onClick={handleSubmit}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('google_drive_wallet.add_key')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveKeyDialog({ role, publicKey, open, onOpenChange, onConfirm }: {
  role: TRole | null; publicKey: string | null; open: boolean;
  onOpenChange: (v: boolean) => void; onConfirm: () => Promise<void>;
}) {
  const { t } = useGDWTranslation();
  const [isRemoving, setIsRemoving] = useState(false);

  const handleConfirm = async () => {
    setIsRemoving(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('google_drive_wallet.toast.error'),
        description: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            {t('google_drive_wallet.remove_role_key', { role })}
          </DialogTitle>
          <DialogDescription>{t('google_drive_wallet.remove_key_warning')}</DialogDescription>
        </DialogHeader>
        {publicKey && (
          <div className="space-y-1.5">
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Key className="h-3.5 w-3.5" />
              {t('google_drive_wallet.public_key')}
            </span>
            <div className="rounded border bg-muted/50 p-2">
              <code className="break-all font-mono text-xs">{publicKey}</code>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={isRemoving} onClick={() => onOpenChange(false)}>
            {t('google_drive_wallet.cancel')}
          </Button>
          <Button variant="destructive" disabled={isRemoving} onClick={handleConfirm}>
            {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('google_drive_wallet.remove_key')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AccountKeyList({
  configuredRoles, rolePublicKeys, isLoadingKeys,
  onAddKey, onRemoveKey, onRemoveAccount
}: AccountKeyListProps) {
  const { t } = useGDWTranslation();
  const [addDialogRole, setAddDialogRole] = useState<TRole | null>(null);
  const [removeDialogRole, setRemoveDialogRole] = useState<TRole | null>(null);
  const [isRemovingAccount, setIsRemovingAccount] = useState(false);
  const unconfiguredRoles = ALL_ROLES.filter((r) => !configuredRoles.includes(r));

  const handleRemoveAccount = async () => {
    setIsRemovingAccount(true);
    try {
      await onRemoveAccount();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('google_drive_wallet.toast.error'),
        description: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsRemovingAccount(false);
    }
  };

  if (isLoadingKeys) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">
        {t('google_drive_wallet.configured_keys')}
      </p>

      {configuredRoles.map((role) => (
        <div key={role} className="space-y-2 rounded-lg border p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="capitalize">{role}</Badge>
              <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Check className="h-4 w-4" />
                {t('google_drive_wallet.configured')}
              </span>
            </div>
            <Button variant="ghost" size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setRemoveDialogRole(role)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {rolePublicKeys[role] && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Key className="h-3.5 w-3.5 shrink-0" />
              <code className="font-mono">{truncateKey(rolePublicKeys[role])}</code>
            </div>
          )}
        </div>
      ))}

      {unconfiguredRoles.map((role) => (
        <div key={role} className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="capitalize">{role}</Badge>
            <span className="text-sm text-muted-foreground">{t('google_drive_wallet.not_configured')}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAddDialogRole(role)}>
            <Plus className="mr-1 h-4 w-4" />
            {t('google_drive_wallet.add_key')}
          </Button>
        </div>
      ))}

      <Button variant="destructive" size="sm" className="w-full"
        disabled={isRemovingAccount} onClick={handleRemoveAccount}>
        {isRemovingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        <Trash2 className="mr-2 h-4 w-4" />
        {t('google_drive_wallet.remove_account')}
      </Button>

      <AddKeyDialog role={addDialogRole} open={addDialogRole !== null}
        onOpenChange={(v) => { if (!v) setAddDialogRole(null); }} onSubmit={onAddKey} />
      <RemoveKeyDialog role={removeDialogRole}
        publicKey={removeDialogRole ? (rolePublicKeys[removeDialogRole] ?? null) : null}
        open={removeDialogRole !== null}
        onOpenChange={(v) => { if (!v) setRemoveDialogRole(null); }}
        onConfirm={() => removeDialogRole ? onRemoveKey(removeDialogRole) : Promise.resolve()} />
    </div>
  );
}
