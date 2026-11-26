import { useState } from 'react';
import { Trans, useSharedTranslation } from '@ui/lib/i18n-client';
import { getLogger } from '@ui/lib/logging';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { removePasskeyUnlock } from '@smart-signer/lib/passkey-unlock/passkey-unlock-store';

const logger = getLogger('app');

type Props = {
  /** The account whose passkey request ended without unlocking */
  username: string;
  /** "Set up again": the next password sign-in of `username` asks for its passkey at once */
  onSetUpAgain: () => void;
};

type State = 'offered' | 'turned-off' | 'set-up-again' | 'failed';

const STATE_KEYS: Record<Exclude<State, 'offered'>, string> = {
  'turned-off': 'passkey_unlock.turned_off',
  'set-up-again': 'login_form.passkey_prompt.set_up_again_hint',
  failed: 'passkey_unlock.turn_off_failed'
};

const LINK = 'cursor-pointer text-blue-600 underline-offset-2 hover:underline dark:text-blue-400';

/**
 * A quiet link on the password form after a passkey request of `username` ended without unlocking,
 * a cancel included: the browser answers a passkey deleted in the password manager as it does a
 * dismissed picker, so it says nothing is wrong. Turning off removes this device's record of
 * `username` alone, signalling nothing to the provider; setting up again leaves the record until
 * the password sign-in replaces it.
 */
export default function PasskeyTroubleLink({ username, onSetUpAgain }: Props) {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const [state, setState] = useState<State>('offered');

  const turnOff = async () => {
    try {
      await removePasskeyUnlock(username);
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

  if (state !== 'offered') {
    return (
      <p className="text-xs text-muted-foreground" role="status" data-testid="passkey-trouble-link" data-state={state}>
        {t(STATE_KEYS[state])}
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground" data-testid="passkey-trouble-link" data-state={state}>
      <Trans
        t={t}
        ns={SMART_SIGNER_NAMESPACE}
        i18nKey="login_form.passkey_prompt.unlock_trouble"
        components={{
          turnOff: <button type="button" className={LINK} onClick={turnOff} data-testid="passkey-trouble-turn-off" />,
          setUp: <button type="button" className={LINK} onClick={setUpAgain} data-testid="passkey-trouble-set-up" />
        }}
      />
    </p>
  );
}
