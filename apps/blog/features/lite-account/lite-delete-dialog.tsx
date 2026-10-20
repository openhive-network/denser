'use client';

import { useState, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@ui/components/alert-dialog';
import { useTranslation } from '@/blog/i18n/client';

type Props = { children: ReactNode; isPost: boolean; onConfirm: () => void };

/** Confirms a lite owner's delete, and says that one with replies or votes stays as a tombstone. */
export function LiteDeleteDialog({ children, isPost, onConfirm }: Props) {
  const { t } = useTranslation('common_blog');
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="flex flex-col gap-6 sm:rounded-r-xl" data-testid="lite-delete-dialog">
        <AlertDialogHeader className="gap-2">
          <AlertDialogTitle>
            {isPost ? t('lite_account.manage.delete_post_title') : t('lite_account.manage.delete_comment_title')}
          </AlertDialogTitle>
          <AlertDialogDescription>{t('lite_account.manage.delete_tombstone_note')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
          <AlertDialogCancel data-testid="lite-delete-cancel">{t('lite_account.manage.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            autoFocus
            className="bg-destructive text-white hover:bg-destructive/80"
            data-testid="lite-delete-confirm"
            onClick={(e) => {
              e.preventDefault();
              setOpen(false);
              onConfirm();
            }}
          >
            {t('lite_account.manage.delete_confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
