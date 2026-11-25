import { useState } from 'react';
import { Button } from '@hive/ui';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { getLogger } from '@ui/lib/logging';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { removePasskeyUnlock } from '@smart-signer/lib/passkey-unlock/passkey-unlock-store';
import { clearPasskeyUnlockFailures } from '@smart-signer/lib/passkey-unlock/passkey-unlock-failures';

const logger = getLogger('app');

type Props = {
  /** The account whose passkey requests failed at its last sign-ins */
  username: string;
  /** "Set up again": the next password sign-in of `username` offers the unlock, its record kept until then */
  onSetUpAgain: () => void;
};

type State = 'asking' | 'turned-off' | 'set-up-again' | 'failed';

const STATE_KEYS: Record<Exclude<State, 'asking'>, string> = {
  'turned-off': 'passkey_unlock.turned_off',
  'set-up-again': 'login_form.passkey_prompt.set_up_again_hint',
  failed: 'passkey_unlock.turn_off_failed'
};

/**
 * Tells, on the password form, that the passkey unlock of `username` failed at its last sign-ins,
 * as it does once the passkey was deleted in the password manager, which the browser answers as a
 * cancel. The user decides: turn the unlock off on this device (its record goes, nothing is
 * signalled to the provider) or set it up again after the password. Nothing is removed unasked.
 */
export default function PasskeyUnlockFailingNotice({ username, onSetUpAgain }: Props) {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const [state, setState] = useState<State>('asking');

  const turnOff = async () => {
    try {
      await removePasskeyUnlock(username);
      clearPasskeyUnlockFailures(username);
      setState('turned-off');
    } catch (error) {
      logger.error(error, 'Turning off the passkey unlock of %s failed', username);
      setState('failed');
    }
  };

  const setUpAgain = () => {
    onSetUpAgain();
    setState('set-up-again');
  };

  if (state !== 'asking') {
    return (
      <div className="text-sm" role="status" data-testid="passkey-unlock-failing-notice" data-state={state}>
        {t(STATE_KEYS[state])}
      </div>
    );
  }

  return (
    <div
      className="mt-2 rounded-md border p-3 text-sm"
      data-testid="passkey-unlock-failing-notice"
      data-state={state}
    >
      <p className="mb-2">{t('login_form.passkey_prompt.unlock_failing')}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-auto min-h-9"
          onClick={turnOff}
          data-testid="passkey-unlock-failing-turn-off"
        >
          {t('login_form.passkey_prompt.unlock_failing_turn_off')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-auto min-h-9"
          onClick={setUpAgain}
          data-testid="passkey-unlock-failing-set-up"
        >
          {t('login_form.passkey_prompt.unlock_failing_set_up')}
        </Button>
      </div>
    </div>
  );
}
