import { useEffect, useRef, useState } from 'react';
import { Button } from '@hive/ui';
import { cn } from '@ui/lib/utils';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { declinePasskeyPrompt, snoozePasskeyPrompt } from '@smart-signer/lib/auth/passkey-prompt-dismissal';
import { PasskeyUnlockError, passkeyEnableFailureKey } from '@smart-signer/lib/passkey-unlock/passkey-unlock-error';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

type Props = {
  /** The safe storage username the passkey would unlock */
  username: string;
  /** Keeps a passkey the account already has (`reusePasskeyUnlockOf` with the password just entered) */
  onReuse: () => Promise<void>;
  /** Creates a passkey (`registerPasskeyUnlock` with the password just entered) */
  onCreate: () => Promise<void>;
  /** Called once the prompt is answered: enabled, "Not now" or "Never ask again" */
  onDone: () => void | Promise<void>;
};

/** `offer`: enable at all; `create`: no passkey of the account was picked, so create one */
type Step = 'offer' | 'create';

const failedWith = (error: unknown, reason: PasskeyUnlockError['reason']) =>
  error instanceof PasskeyUnlockError && error.reason === reason;

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

// One per row on a phone, full width, so that each label fits on one line
const BUTTON_LAYOUT = 'h-auto min-h-9 w-full sm:w-auto';

/**
 * The offer, after a password sign-in to safe storage, to unlock with a passkey instead of the
 * password. Enable looks for the account's passkey first, synced from another device, and keeps
 * it: creating one would replace it there. Only where none is picked does the next step offer to
 * create one. "Not now" brings the offer back after a few hours, "Never ask again" keeps it away
 * for `username`; a failed or cancelled browser prompt shows the reason and keeps the offer open,
 * dismissing nothing.
 */
export default function PasskeyPrompt({ username, onReuse, onCreate, onDone }: Props) {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const [step, setStep] = useState<Step>('offer');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const headingRef = useRef<HTMLParagraphElement>(null);

  // Shown where the password field was: once a phone's keyboard closes, the dialog may stay
  // scrolled past the heading
  useEffect(() => {
    const showHeading = () => headingRef.current?.scrollIntoView({ block: 'nearest' });
    showHeading();
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', showHeading);
    return () => viewport?.removeEventListener('resize', showHeading);
  }, []);

  const run = async (ceremony: () => Promise<void>, onFailure: (error: unknown) => void) => {
    setBusy(true);
    setMessage(null);
    try {
      await ceremony();
    } catch (error) {
      logger.info('Passkey unlock not enabled for %s: %s', username, describe(error));
      onFailure(error);
      setBusy(false);
      return;
    }
    await onDone();
  };

  const reuse = () =>
    run(onReuse, (error) => {
      // The browser answers a relying party without passkeys as it does a cancel: offer to create one
      const cancelled = failedWith(error, 'cancelled');
      if (cancelled || failedWith(error, 'wrong-account')) setStep('create');
      if (!cancelled) setMessage(t(passkeyEnableFailureKey(error)));
    });

  const create = () => run(onCreate, (error) => setMessage(t(passkeyEnableFailureKey(error))));

  const dismiss = async (remember: (username: string) => void) => {
    remember(username);
    await onDone();
  };
  const notNow = () => dismiss(snoozePasskeyPrompt);
  const never = () => dismiss(declinePasskeyPrompt);

  const creating = step === 'create';
  return (
    <div
      className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950"
      data-testid="passkey-prompt"
      data-step={step}
    >
      <p ref={headingRef} className="mb-2 scroll-mt-4 text-sm font-medium" data-testid="passkey-prompt-title">
        {t(creating ? 'login_form.passkey_prompt.create_title' : 'login_form.passkey_prompt.title')}
      </p>
      <p className="mb-3 text-xs text-muted-foreground">
        {t(creating ? 'login_form.passkey_prompt.create_description' : 'login_form.passkey_prompt.description')}
      </p>
      {message && (
        <p className="mb-3 text-xs text-destructive" role="alert" data-testid="passkey-prompt-error">
          {message}
        </p>
      )}
      <div className="flex select-none flex-col gap-2 sm:flex-row sm:flex-wrap">
        {creating ? (
          <>
            <Button
              size="sm"
              className={cn(BUTTON_LAYOUT, 'bg-blue-600 text-white hover:bg-blue-500')}
              disabled={busy}
              onClick={create}
              data-testid="passkey-prompt-create"
            >
              {t('login_form.passkey_prompt.create')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={BUTTON_LAYOUT}
              disabled={busy}
              onClick={reuse}
              data-testid="passkey-prompt-reuse"
            >
              {t('login_form.passkey_prompt.use_existing')}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className={cn(BUTTON_LAYOUT, 'bg-blue-600 text-white hover:bg-blue-500')}
            disabled={busy}
            onClick={reuse}
            data-testid="passkey-prompt-enable"
          >
            {t('login_form.passkey_prompt.enable')}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className={BUTTON_LAYOUT}
          disabled={busy}
          onClick={notNow}
          data-testid="passkey-prompt-not-now"
        >
          {t('login_form.passkey_prompt.not_now')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={cn(BUTTON_LAYOUT, 'text-muted-foreground')}
          disabled={busy}
          onClick={never}
          data-testid="passkey-prompt-never"
        >
          {t('login_form.passkey_prompt.never_ask_again')}
        </Button>
      </div>
    </div>
  );
}
