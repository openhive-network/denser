'use client';

import { FC } from 'react';
import { create, InstanceProps } from 'react-modal-promise';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/components/dialog';
import { Button } from '@ui/components';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import type { LeaveStoredKeysChoice } from '@smart-signer/lib/auth/key-protection';
import type { LeaveKind } from '@smart-signer/lib/auth/key-protection-browser';

interface LeaveSavedKeyDialogProps {
  /** The accounts whose keys are saved unprotected in this browser */
  usernames: string[];
  kind: LeaveKind;
}

/**
 * Asked before a sign-out or an account removal forgets keys saved unprotected in this browser:
 * protect them with safe storage, forget them and go on, or cancel. A closed dialog is "Cancel".
 */
const LeaveSavedKeyDialog: FC<LeaveSavedKeyDialogProps & InstanceProps<LeaveStoredKeysChoice>> = ({
  isOpen = false,
  onResolve,
  usernames,
  kind
}) => {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const cancel = () => onResolve('cancel');
  const forget = () => onResolve('forget');
  const protect = () => onResolve('protect');
  const onOpenChange = (open: boolean) => {
    if (!open) cancel();
  };
  const accounts = usernames.map((username) => `@${username}`).join(', ');
  const isSignOut = kind === 'signOut';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="leave-saved-key-dialog">
        <DialogHeader>
          <DialogTitle>{t('key_protection.leave_title')}</DialogTitle>
          <DialogDescription className="pt-2">
            {isSignOut
              ? t('key_protection.leave_description_sign_out', { accounts })
              : t('key_protection.leave_description_remove_account', { accounts })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={cancel} data-testid="leave-saved-key-cancel">
            {t('key_protection.cancel_button')}
          </Button>
          <Button variant="destructive" onClick={forget} data-testid="leave-saved-key-forget">
            {isSignOut
              ? t('key_protection.leave_forget_sign_out_button')
              : t('key_protection.leave_forget_remove_account_button')}
          </Button>
          <Button onClick={protect} data-testid="leave-saved-key-protect">
            {t('key_protection.leave_protect_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const LeaveSavedKeyDialogPromise = create(LeaveSavedKeyDialog);
