'use client';

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@ui/components/alert-dialog';
import { toast } from '@ui/components/hooks/use-toast';
import { useTranslation } from '@/blog/i18n/client';

interface DeleteWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => Promise<void>;
}

export function DeleteWalletDialog({ open, onOpenChange, onConfirmDelete }: DeleteWalletDialogProps) {
  const { t } = useTranslation('common_blog');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDeleting(true);
    try {
      await onConfirmDelete();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('google_drive_wallet.toast.error'),
        description: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="flex flex-col gap-4 sm:max-w-md sm:rounded-r-xl">
        <AlertDialogHeader className="gap-2">
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            {t('google_drive_wallet.delete_dialog.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('google_drive_wallet.delete_dialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <strong>{t('google_drive_wallet.delete_dialog.warning_label')}</strong>{' '}
          {t('google_drive_wallet.delete_dialog.warning_text')}
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>{t('google_drive_wallet.delete_dialog.this_will')}</p>
          <ul className="ml-2 list-inside list-disc space-y-1">
            <li>{t('google_drive_wallet.delete_dialog.remove_keys')}</li>
            <li>{t('google_drive_wallet.delete_dialog.delete_file')}</li>
            <li>{t('google_drive_wallet.delete_dialog.clear_encryption')}</li>
          </ul>
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={isDeleting}>
            {t('google_drive_wallet.delete_dialog.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeleting
              ? t('google_drive_wallet.delete_dialog.deleting')
              : t('google_drive_wallet.delete_dialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
