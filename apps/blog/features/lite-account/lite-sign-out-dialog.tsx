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
import { toast } from '@ui/components/hooks/use-toast';
import { useTranslation } from '@/blog/i18n/client';
import { forgetLiteAccount } from './lite-storage';
import { useStoredLiteIdentity } from './use-stored-lite-identity';
import { useLitePasskeyAccess } from './use-lite-passkey';
import { usePasskeyFlow } from './use-passkey-flow';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

/**
 * Signs this browser out of its secured lite account: its posting key removes itself on chain, then
 * the browser forgets the account. The account stays usable from its other devices and the passkey.
 */
export function LiteSignOutDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation('common_blog');
  const identity = useStoredLiteIdentity();
  const { relay } = useLitePasskeyAccess();
  const { run, pending } = usePasskeyFlow(identity?.name);

  const signOut = () => {
    if (!identity || !relay) return;
    void run(null, async () => {
      const { signOutDevice } = await import('./lite-authority-flows');
      await signOutDevice(identity, relay);
      forgetLiteAccount();
      toast({ title: t('lite_account.passkey.signed_out_title', { name: identity.name }) });
      onOpenChange(false);
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="flex flex-col gap-6 sm:rounded-r-xl" data-testid="lite-sign-out-dialog">
        <AlertDialogHeader className="gap-2">
          <AlertDialogTitle>
            {t('lite_account.passkey.sign_out_title', { name: identity?.name ?? '' })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t('lite_account.passkey.sign_out_description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
          <AlertDialogCancel disabled={pending}>{t('lite_account.manage.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            data-testid="lite-sign-out-confirm"
            onClick={(e) => {
              e.preventDefault();
              signOut();
            }}
          >
            {pending ? t('lite_account.passkey.working') : t('lite_account.passkey.sign_out_confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
