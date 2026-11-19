'use client';

import { FC } from 'react';
import { create, InstanceProps } from 'react-modal-promise';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/components/dialog';
import { Button } from '@ui/components';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

/**
 * Asks to confirm that this browser forgets the keys of an account saved unprotected in it.
 * Resolves true for "Forget key", false for "Cancel" or a closed dialog.
 */
const ForgetSavedKeyDialog: FC<InstanceProps<boolean>> = ({ isOpen = false, onResolve }) => {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const cancel = () => onResolve(false);
  const forget = () => onResolve(true);
  const onOpenChange = (open: boolean) => {
    if (!open) cancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="forget-saved-key-dialog">
        <DialogHeader>
          <DialogTitle>{t('key_protection.forget_title')}</DialogTitle>
          <DialogDescription className="pt-2">{t('key_protection.forget_description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={cancel} data-testid="forget-saved-key-cancel">
            {t('key_protection.cancel_button')}
          </Button>
          <Button variant="destructive" onClick={forget} data-testid="forget-saved-key-confirm">
            {t('key_protection.forget_confirm_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const ForgetSavedKeyDialogPromise = create(ForgetSavedKeyDialog);
