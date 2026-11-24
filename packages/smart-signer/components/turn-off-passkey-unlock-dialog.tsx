'use client';

import { FC } from 'react';
import { create, InstanceProps } from 'react-modal-promise';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/components/dialog';
import { Button } from '@ui/components';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

/**
 * Asks to confirm that this device stops unlocking safe storage with a passkey, which stays in the
 * password manager. Resolves true for "Turn off", false for "Cancel" or a closed dialog.
 */
const TurnOffPasskeyUnlockDialog: FC<InstanceProps<boolean>> = ({ isOpen = false, onResolve }) => {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const cancel = () => onResolve(false);
  const turnOff = () => onResolve(true);
  const onOpenChange = (open: boolean) => {
    if (!open) cancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="turn-off-passkey-unlock-dialog">
        <DialogHeader>
          <DialogTitle>{t('passkey_unlock.turn_off_title')}</DialogTitle>
          <DialogDescription className="pt-2">{t('passkey_unlock.turn_off_description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={cancel} data-testid="turn-off-passkey-unlock-cancel">
            {t('passkey_unlock.cancel_button')}
          </Button>
          <Button variant="destructive" onClick={turnOff} data-testid="turn-off-passkey-unlock-confirm">
            {t('passkey_unlock.turn_off_confirm_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const TurnOffPasskeyUnlockDialogPromise = create(TurnOffPasskeyUnlockDialog);
