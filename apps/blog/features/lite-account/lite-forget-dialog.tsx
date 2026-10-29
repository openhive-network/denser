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

/**
 * What forgetting means: `plain` where passkeys are not offered (the key exists only here),
 * `unsecured` (forgetting destroys the account; securing it first keeps it), `secured` (the
 * account lives on; this browser's key stays on it until it expires, Sign out removes it now).
 */
export type LiteForgetVariant = 'plain' | 'unsecured' | 'secured';

const DESCRIPTION_KEYS: Record<LiteForgetVariant, string> = {
  plain: 'lite_account.identity.forget_description',
  unsecured: 'lite_account.identity.forget_description_unsecured',
  secured: 'lite_account.identity.forget_description_secured'
};

type Props = { name: string; variant?: LiteForgetVariant; open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void };

/** Confirms forgetting the browser's lite account, saying what it costs. */
export function LiteForgetDialog({ name, variant = 'plain', open, onOpenChange, onConfirm }: Props) {
  const { t } = useTranslation('common_blog');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="flex flex-col gap-6 sm:rounded-r-xl" data-testid="lite-forget-dialog">
        <AlertDialogHeader className="gap-2">
          <AlertDialogTitle>{t('lite_account.identity.forget_title', { name })}</AlertDialogTitle>
          <AlertDialogDescription data-variant={variant}>{t(DESCRIPTION_KEYS[variant])}</AlertDialogDescription>
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
