import { Button } from '@hive/ui';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { declinePasskeyPrompt, snoozePasskeyPrompt } from '@smart-signer/lib/auth/passkey-prompt-dismissal';
import { passkeyEnableFailureKey } from '@smart-signer/lib/passkey-unlock/passkey-unlock-error';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

type Props = {
  /** The safe storage username the passkey would unlock */
  username: string;
  /** Registers the passkey (`registerPasskeyUnlock` with the password just entered) */
  onEnable: () => Promise<void>;
  /** Called with the translated message of a failed registration; not for a prompt the user cancelled */
  onError: (message: string) => void;
  /** Called once the prompt is answered, whichever way */
  onDone: () => void | Promise<void>;
};

/**
 * The offer, after a password sign-in to safe storage, to unlock with a passkey instead of the
 * password: Enable registers it, "Not now" brings the offer back after a few hours, "Never ask
 * again" keeps it away for `username`. An Enable that fails or is cancelled in the browser's
 * prompt counts as "Not now": the next sign-ins do not create a passkey each.
 */
export default function PasskeyPrompt({ username, onEnable, onError, onDone }: Props) {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });

  const enable = async () => {
    try {
      await onEnable();
    } catch (error) {
      logger.info('Passkey unlock not enabled for %s: %s', username, error instanceof Error ? error.message : String(error));
      snoozePasskeyPrompt(username);
      const messageKey = passkeyEnableFailureKey(error);
      if (messageKey) onError(t(messageKey));
    } finally {
      await onDone();
    }
  };

  const dismiss = async (remember: (username: string) => void) => {
    remember(username);
    await onDone();
  };

  return (
    <div
      className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950"
      data-testid="passkey-prompt"
    >
      <p className="mb-2 text-sm font-medium">{t('login_form.passkey_prompt.title')}</p>
      <p className="mb-3 text-xs text-muted-foreground">{t('login_form.passkey_prompt.description')}</p>
      <div className="flex select-none gap-2">
        <Button
          size="sm"
          className="bg-blue-600 text-white hover:bg-blue-500"
          onClick={enable}
          data-testid="passkey-prompt-enable"
        >
          {t('login_form.passkey_prompt.enable')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => dismiss(snoozePasskeyPrompt)} data-testid="passkey-prompt-not-now">
          {t('login_form.passkey_prompt.not_now')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => dismiss(declinePasskeyPrompt)}
          data-testid="passkey-prompt-never"
        >
          {t('login_form.passkey_prompt.never_ask_again')}
        </Button>
      </div>
    </div>
  );
}
