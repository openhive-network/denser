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
import type { LoginType } from '@smart-signer/types/common';
import type { LockoutRisk } from '@/wallet/lib/authority-checks';
import { useTranslation } from '@/wallet/i18n/client';
import KeyChangeFollowUp from './key-change-follow-up';

interface AuthorityLockoutDialogProps {
  /** The risks of the change to confirm; the dialog is open while there are any */
  risks: readonly LockoutRisk[];
  loginType: `${LoginType}`;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Asks to confirm an authority change that can lock the user out, naming each way it can. */
const AuthorityLockoutDialog = ({ risks, loginType, onConfirm, onCancel }: AuthorityLockoutDialogProps) => {
  const { t } = useTranslation('common_wallet');
  return (
    <AlertDialog open={risks.length > 0} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent data-testid="authority-lockout-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('authorities_page.lockout.title')}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              {risks.map((risk) =>
                risk === 'wallet_keys' ? (
                  <KeyChangeFollowUp key={risk} loginType={loginType} />
                ) : (
                  <p key={risk}>{t(`authorities_page.lockout.${risk}`)}</p>
                )
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t('authorities_page.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t('authorities_page.lockout.confirm')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AuthorityLockoutDialog;
