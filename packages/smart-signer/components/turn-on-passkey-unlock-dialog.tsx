'use client';

import { FC } from 'react';
import { create, InstanceProps } from 'react-modal-promise';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ui/components/dialog';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { registerPasskeyUnlock, reusePasskeyUnlockOf } from '@smart-signer/lib/passkey-unlock/passkey-unlock';
import PasskeyPrompt from '@smart-signer/components/auth/passkey-prompt';

type Props = {
  username: string;
  /** The safe storage password of `username`, just checked */
  password: string;
};

/**
 * Turns the passkey unlock of `username` on on this device, as the offer after a password sign-in
 * does, without asking again whether to: the account's passkey is asked for at once, synced from
 * another device or left from before, and created only where none is picked. Resolves true once
 * on, false for "Cancel" or a closed dialog.
 */
const TurnOnPasskeyUnlockDialog: FC<Props & InstanceProps<boolean>> = ({
  isOpen = false,
  onResolve,
  username,
  password
}) => {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const cancel = () => onResolve(false);
  const onOpenChange = (open: boolean) => {
    if (!open) cancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="turn-on-passkey-unlock-dialog">
        <DialogHeader>
          <DialogTitle>{t('passkey_unlock.turn_on_title')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('login_form.passkey_prompt.description')}
          </DialogDescription>
        </DialogHeader>
        <PasskeyPrompt
          username={username}
          onReuse={() => reusePasskeyUnlockOf(username, password)}
          onCreate={() => registerPasskeyUnlock(username, password)}
          onDone={() => onResolve(true)}
          onCancel={cancel}
          skipOffer
        />
      </DialogContent>
    </Dialog>
  );
};

export const TurnOnPasskeyUnlockDialogPromise = create(TurnOnPasskeyUnlockDialog);
