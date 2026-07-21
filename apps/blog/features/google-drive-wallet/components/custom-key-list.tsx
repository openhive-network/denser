'use client';

import { useState } from 'react';
import { Key, Loader2, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import type { CustomKey } from '@smart-signer/lib/google-drive-wallet-manager';
import { useTranslation } from '@/blog/i18n/client';
import { toast } from '@ui/components/hooks/use-toast';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Badge } from '@ui/components/badge';
import { Separator } from '@ui/components/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@ui/components/dialog';

const RESERVED_ALIASES = ['posting', 'active', 'owner', 'memo'];

interface CustomKeyListProps {
  customKeys: CustomKey[];
  onAddCustomKey: (alias: string, privateKey: string, description?: string) => Promise<void>;
  onRemoveCustomKey: (alias: string) => Promise<void>;
}

export function CustomKeyList({ customKeys, onAddCustomKey, onRemoveCustomKey }: CustomKeyListProps) {
  const { t } = useTranslation('common_blog');

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<CustomKey | null>(null);

  const [newAlias, setNewAlias] = useState('');
  const [newPrivateKey, setNewPrivateKey] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function resetAddForm() {
    setNewAlias('');
    setNewPrivateKey('');
    setNewDescription('');
    setShowPrivateKey(false);
  }

  function openAddDialog() {
    resetAddForm();
    setShowAddDialog(true);
  }

  function openDeleteDialog(key: CustomKey) {
    setKeyToDelete(key);
    setShowDeleteDialog(true);
  }

  async function handleAddKey() {
    const alias = newAlias.trim();
    const privateKey = newPrivateKey.trim();
    if (!alias || !privateKey) return;

    if (RESERVED_ALIASES.includes(alias.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: t('google_drive_wallet.toast.error'),
        description: t('google_drive_wallet.custom_keys.reserved_alias', { alias })
      });
      return;
    }

    setIsSaving(true);
    try {
      await onAddCustomKey(alias, privateKey, newDescription.trim() || undefined);
      setShowAddDialog(false);
      resetAddForm();
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

  async function handleDeleteKey() {
    if (!keyToDelete) return;

    setIsDeleting(true);
    try {
      await onRemoveCustomKey(keyToDelete.alias);
      setShowDeleteDialog(false);
      setKeyToDelete(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('google_drive_wallet.toast.error'),
        description: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const canSubmitAdd = newAlias.trim().length > 0 && newPrivateKey.trim().length > 0 && !isSaving;

  return (
    <div className="space-y-4">
      <Separator />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold leading-5">
            <Key className="h-4 w-4 text-muted-foreground" />
            {t('google_drive_wallet.custom_keys.title')}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('google_drive_wallet.custom_keys.section_description')}
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={openAddDialog}>
          <Plus className="mr-1 h-4 w-4" />
          {t('google_drive_wallet.custom_keys.add_button')}
        </Button>
      </div>

      {customKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
          <Key className="mb-2 h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {t('google_drive_wallet.custom_keys.empty_state')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {customKeys.map((key) => (
            <div
              key={key.alias}
              className="space-y-2 rounded-lg border p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{key.alias}</Badge>
                  {key.description ? (
                    <span className="text-sm text-muted-foreground">{key.description}</span>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => openDeleteDialog(key)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="rounded border bg-muted/50 p-2">
                <code className="break-all font-mono text-xs text-foreground">
                  {key.publicKey}
                </code>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        <p className="mb-1 font-medium">{t('google_drive_wallet.custom_keys.about_title')}</p>
        <p>{t('google_drive_wallet.custom_keys.about_description')}</p>
      </div>

      {/* Add Custom Key Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {t('google_drive_wallet.custom_keys.add_dialog_title')}
            </DialogTitle>
            <DialogDescription>
              {t('google_drive_wallet.custom_keys.add_dialog_description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-key-alias">
                {t('google_drive_wallet.custom_keys.alias_label')}
              </Label>
              <Input
                id="custom-key-alias"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                placeholder={t('google_drive_wallet.custom_keys.alias_placeholder')}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-private-key">
                {t('google_drive_wallet.custom_keys.private_key_label')}
              </Label>
              <div className="relative">
                <Input
                  id="custom-private-key"
                  type={showPrivateKey ? 'text' : 'password'}
                  value={newPrivateKey}
                  onChange={(e) => setNewPrivateKey(e.target.value)}
                  placeholder={t('google_drive_wallet.custom_keys.private_key_placeholder')}
                  autoComplete="off"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                >
                  {showPrivateKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-key-description">
                {t('google_drive_wallet.custom_keys.description_label')}
              </Label>
              <Input
                id="custom-key-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={t('google_drive_wallet.custom_keys.description_placeholder')}
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={isSaving} onClick={() => setShowAddDialog(false)}>
              {t('google_drive_wallet.custom_keys.cancel')}
            </Button>
            <Button disabled={!canSubmitAdd} onClick={handleAddKey}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSaving
                ? t('google_drive_wallet.custom_keys.adding')
                : t('google_drive_wallet.custom_keys.add_key')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Custom Key Dialog */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteDialog(false);
            setKeyToDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              {t('google_drive_wallet.custom_keys.remove_dialog_title', {
                alias: keyToDelete?.alias
              })}
            </DialogTitle>
            <DialogDescription>
              {t('google_drive_wallet.custom_keys.remove_dialog_description')}
            </DialogDescription>
          </DialogHeader>

          <p className="my-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            {t('google_drive_wallet.custom_keys.remove_warning')}
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={() => {
                setShowDeleteDialog(false);
                setKeyToDelete(null);
              }}
            >
              {t('google_drive_wallet.custom_keys.cancel')}
            </Button>
            <Button variant="destructive" disabled={isDeleting} onClick={handleDeleteKey}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isDeleting
                ? t('google_drive_wallet.custom_keys.removing')
                : t('google_drive_wallet.custom_keys.remove_key')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
