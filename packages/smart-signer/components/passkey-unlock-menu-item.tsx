/* The account menu's way to turn the passkey unlock of a safe-storage session on or off on this device */
import { FC, useEffect, useState } from 'react';
import { DropdownMenuItem } from '@ui/components/dropdown-menu';
import { toast } from '@ui/components/hooks/use-toast';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { getLogger } from '@ui/lib/logging';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { readPasskeyUnlock, removePasskeyUnlock } from '@smart-signer/lib/passkey-unlock/passkey-unlock-store';
import { LoginType, type User } from '@smart-signer/types/common';

const logger = getLogger('app');

/** Whether this browser has WebAuthn at all; whether its authenticator has the PRF shows only at enabling */
const hasWebAuthn = () => typeof PublicKeyCredential !== 'undefined';

/**
 * Whether `username` unlocks safe storage with a passkey on this device: undefined until read, or
 * when the read fails, and for no user
 */
function usePasskeyUnlockRecord(username: string | undefined): [boolean | undefined, (linked: boolean) => void] {
  const [linked, setLinked] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    setLinked(undefined);
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
  return [linked, setLinked];
}

/**
 * Turns the passkey unlock of a safe-storage session off on this device, after a confirmation, or
 * on where this device has none. Off, its record goes and the next sign-in asks for the password,
 * offering the unlock again after it; the passkey stays in the password manager, which the app
 * cannot remove it from, and nothing is signalled to it. On, the password is asked, then the
 * account's passkey is picked (created only where none is), as the offer after a sign-in does.
 */
const PasskeyUnlockMenuItem: FC<{ user: User }> = ({ user }) => {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const isSafeStorage = user.loginType === LoginType.hbauth;
  const [linked, setLinked] = usePasskeyUnlockRecord(isSafeStorage ? user.username : undefined);

  if (linked === undefined) return null;

  const turnOff = async () => {
    const { TurnOffPasskeyUnlockDialogPromise } = await import('@smart-signer/components/turn-off-passkey-unlock-dialog');
    if (!(await TurnOffPasskeyUnlockDialogPromise({ isOpen: true }))) return;
    try {
      await removePasskeyUnlock(user.username);
      setLinked(false);
      toast({ description: t('passkey_unlock.turned_off'), variant: 'success' });
    } catch (error) {
      logger.error(error, 'Turning off the passkey unlock of %s failed', user.username);
      toast({ description: t('passkey_unlock.turn_off_failed'), variant: 'destructive' });
    }
  };

  const turnOn = async () => {
    try {
      // The signing stack loads only now: being signed in loads none of it
      const { turnOnPasskeyUnlock } = await import('@smart-signer/lib/auth/turn-on-passkey-unlock');
      if (!(await turnOnPasskeyUnlock(user.username))) return;
      setLinked(true);
      toast({ description: t('passkey_unlock.turned_on'), variant: 'success' });
    } catch (error) {
      logger.error(error, 'Turning on the passkey unlock of %s failed', user.username);
      toast({ description: t('passkey_unlock.turn_on_failed'), variant: 'destructive' });
    }
  };

  if (linked) {
    return (
      <DropdownMenuItem className="cursor-pointer text-xs" onSelect={turnOff} data-testid="passkey-unlock-turn-off-menu-item">
        {t('passkey_unlock.menu_label')}
      </DropdownMenuItem>
    );
  }
  if (!hasWebAuthn()) return null;
  return (
    <DropdownMenuItem className="cursor-pointer text-xs" onSelect={turnOn} data-testid="passkey-unlock-turn-on-menu-item">
      {t('passkey_unlock.turn_on_menu_label')}
    </DropdownMenuItem>
  );
};

export default PasskeyUnlockMenuItem;
