'use client';

import { useState } from 'react';
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
import { Checkbox, Label } from '@ui/components';
import type { LoginType } from '@smart-signer/types/common';
import { keyChangeFollowUp } from '@/wallet/lib/account-keys';
import { useTranslation } from '@/wallet/i18n/client';
import KeyChangeFollowUp from './key-change-follow-up';

interface ChangePasswordConfirmDialogProps {
  open: boolean;
  loginType: `${LoginType}`;
  /** `keepPosting`: leave the posting key as it is, offered to a passkey session */
  onConfirm: (keepPosting: boolean) => void;
  onCancel: () => void;
}

/**
 * Asks to confirm a password change after saying what, for the session's login method, has to be
 * updated once the keys change.
 */
const ChangePasswordConfirmDialog = ({ open, loginType, onConfirm, onCancel }: ChangePasswordConfirmDialogProps) => {
  const { t } = useTranslation('common_wallet');
  const [keepPosting, setKeepPosting] = useState(false);
  const passkey = keyChangeFollowUp(loginType) === 'passkey_lost';
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent data-testid="change-password-confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('change_password_page.confirm.title')}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <p>{t('change_password_page.confirm.replaces_keys')}</p>
              <KeyChangeFollowUp loginType={loginType} />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {passkey ? (
          <div className="flex items-start gap-2">
            <Checkbox
              id="keep-posting-key"
              checked={keepPosting}
              onCheckedChange={(checked) => setKeepPosting(checked === true)}
            />
            <Label htmlFor="keep-posting-key" className="text-sm">
              {t('change_password_page.confirm.keep_posting_key')}
            </Label>
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t('change_password_page.confirm.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(passkey && keepPosting)}>
            {t('change_password_page.confirm.proceed')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ChangePasswordConfirmDialog;
