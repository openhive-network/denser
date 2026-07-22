'use client';

import { useGDWTranslation } from '../i18n/context';
import type { TRole } from '@smart-signer/lib/google-drive-wallet-manager';
import { Button } from '@ui/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/components/dialog';
import { toast } from '@ui/components/hooks/use-toast';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Eye, EyeOff, Loader2, Plus, ShieldAlert, UserPlus } from 'lucide-react';
import { type FormEvent, useCallback, useState } from 'react';

const ROLES: TRole[] = ['posting', 'active', 'owner', 'memo'];

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountAdded: (accountName: string, role: TRole, privateKey: string) => Promise<void>;
}

export function AddAccountDialog({ open, onOpenChange, onAccountAdded }: AddAccountDialogProps) {
  const { t } = useGDWTranslation();
  const [accountName, setAccountName] = useState('');
  const [selectedRole, setSelectedRole] = useState<TRole>('posting');
  const [privateKey, setPrivateKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = useCallback(() => {
    setAccountName('');
    setSelectedRole('posting');
    setPrivateKey('');
    setShowKey(false);
  }, []);

  const canSubmit = accountName.trim() !== '' && privateKey.trim() !== '' && !isSaving;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      await onAccountAdded(accountName.trim().toLowerCase(), selectedRole, privateKey.trim());
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('google_drive_wallet.toast.error'),
        description: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t('google_drive_wallet.add_account.title')}
          </DialogTitle>
          <DialogDescription>{t('google_drive_wallet.add_account.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="gdw-account-name">{t('google_drive_wallet.add_account.account_name')}</Label>
            <Input
              id="gdw-account-name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder={t('google_drive_wallet.add_account.account_placeholder')}
              autoComplete="off"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('google_drive_wallet.add_account.role')}</Label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <Button
                  key={role}
                  type="button"
                  size="sm"
                  variant={selectedRole === role ? 'default' : 'outline'}
                  onClick={() => setSelectedRole(role)}
                  disabled={isSaving}
                  className="capitalize"
                >
                  {t(`google_drive_wallet.add_account.role_${role}`)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {t(`google_drive_wallet.add_account.role_${selectedRole}_desc`)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gdw-private-key">{t('google_drive_wallet.add_account.private_key')}</Label>
            <div className="relative">
              <Input
                id="gdw-private-key"
                type={showKey ? 'text' : 'password'}
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder={t('google_drive_wallet.add_account.key_placeholder')}
                autoComplete="off"
                disabled={isSaving}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowKey((prev) => !prev)}
                tabIndex={-1}
                aria-label={t('google_drive_wallet.add_account.toggle_visibility')}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            {t('google_drive_wallet.add_account.security_note')}
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => handleOpenChange(false)}>
              {t('google_drive_wallet.add_account.cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
              {isSaving ? t('google_drive_wallet.add_account.adding') : t('google_drive_wallet.add_account.add_account')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
