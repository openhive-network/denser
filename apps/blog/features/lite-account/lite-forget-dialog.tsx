'use client';

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
import { useTranslation } from '@/blog/i18n/client';

type Props = { name: string; open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void };

/** Confirms forgetting the browser's lite account, and says its key exists only in this browser. */
export function LiteForgetDialog({ name, open, onOpenChange, onConfirm }: Props) {
  const { t } = useTranslation('common_blog');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="flex flex-col gap-6 sm:rounded-r-xl" data-testid="lite-forget-dialog">
        <AlertDialogHeader className="gap-2">
          <AlertDialogTitle>{t('lite_account.identity.forget_title', { name })}</AlertDialogTitle>
          <AlertDialogDescription>{t('lite_account.identity.forget_description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
          <AlertDialogCancel data-testid="lite-forget-cancel">{t('lite_account.manage.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/80"
            data-testid="lite-forget-confirm"
            onClick={(e) => {
              e.preventDefault();
              onOpenChange(false);
              onConfirm();
            }}
          >
            {t('lite_account.identity.forget_confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
