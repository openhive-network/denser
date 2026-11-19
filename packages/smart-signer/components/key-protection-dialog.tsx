'use client';

import { FC } from 'react';
import { create, InstanceProps } from 'react-modal-promise';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/components/dialog';
import { Button } from '@ui/components';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

interface KeyProtectionDialogProps {
  username: string;
}

/**
 * Tells that a key of `username` is saved unprotected in this browser and offers to protect it with
 * safe storage. Resolves true for "Set a password", false for "Not now" or a closed dialog.
 */
const KeyProtectionDialog: FC<KeyProtectionDialogProps & InstanceProps<boolean>> = ({
  isOpen = false,
  onResolve,
  username
}) => {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const notNow = () => onResolve(false);
  const protect = () => onResolve(true);
  const onOpenChange = (open: boolean) => {
    if (!open) notNow();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="key-protection-dialog">
        <DialogHeader>
          <DialogTitle>{t('key_protection.dialog_title')}</DialogTitle>
          <DialogDescription className="pt-2">{t('key_protection.dialog_description', { username })}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={notNow} data-testid="key-protection-not-now">
            {t('key_protection.not_now_button')}
          </Button>
          <Button onClick={protect} data-testid="key-protection-set-password">
            {t('key_protection.set_password_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const KeyProtectionDialogPromise = create(KeyProtectionDialog);
