/* The account menu's way to stop unlocking a safe-storage session with a passkey on this device */
import { FC, useEffect, useState } from 'react';
import { DropdownMenuItem } from '@ui/components/dropdown-menu';
import { toast } from '@ui/components/hooks/use-toast';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { getLogger } from '@ui/lib/logging';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { readPasskeyUnlock, removePasskeyUnlock } from '@smart-signer/lib/passkey-unlock/passkey-unlock-store';
import { snoozePasskeyPrompt } from '@smart-signer/lib/auth/passkey-prompt-dismissal';
import { LoginType, type User } from '@smart-signer/types/common';

const logger = getLogger('app');

/** Whether `username` unlocks safe storage with a passkey on this device; false until read, or when the read fails */
function usePasskeyUnlockRecord(username: string | undefined): [boolean, () => void] {
  const [linked, setLinked] = useState(false);
  useEffect(() => {
    setLinked(false);
    if (!username) return;
    let current = true;
    readPasskeyUnlock(username)
      .then((record) => {
        if (current) setLinked(record !== null);
      })
      .catch((error: unknown) => logger.error(error, 'Reading the passkey unlock of %s failed', username));
    return () => {
      current = false;
    };
  }, [username]);
  return [linked, () => setLinked(false)];
}

/**
 * Turns the passkey unlock of a safe-storage session off on this device, after a confirmation: its
 * record goes, so the next sign-in asks for the password, and the offer to enable it again waits as
 * after "Not now". The passkey stays in the password manager, which the app cannot remove it from.
 */
const PasskeyUnlockMenuItem: FC<{ user: User }> = ({ user }) => {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const isSafeStorage = user.loginType === LoginType.hbauth;
  const [linked, forget] = usePasskeyUnlockRecord(isSafeStorage ? user.username : undefined);

  if (!linked) return null;

  const turnOff = async () => {
    const { TurnOffPasskeyUnlockDialogPromise } = await import('@smart-signer/components/turn-off-passkey-unlock-dialog');
    if (!(await TurnOffPasskeyUnlockDialogPromise({ isOpen: true }))) return;
    try {
      await removePasskeyUnlock(user.username);
      snoozePasskeyPrompt(user.username);
      forget();
      toast({ description: t('passkey_unlock.turned_off'), variant: 'success' });
    } catch (error) {
      logger.error(error, 'Turning off the passkey unlock of %s failed', user.username);
      toast({ description: t('passkey_unlock.turn_off_failed'), variant: 'destructive' });
    }
  };

  return (
    <DropdownMenuItem className="cursor-pointer text-xs" onSelect={turnOff} data-testid="passkey-unlock-turn-off-menu-item">
      {t('passkey_unlock.menu_label')}
    </DropdownMenuItem>
  );
};

export default PasskeyUnlockMenuItem;
