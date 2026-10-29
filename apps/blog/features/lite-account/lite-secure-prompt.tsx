'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@ui/components/button';
import { Icons } from '@ui/components/icons';
import { useTranslation } from '@/blog/i18n/client';
import type { StoredLiteIdentity } from './lite-identity-record';

/**
 * Whether to prompt the guest to secure `identity`: from the moment it turns registered (its first
 * post) while this is mounted, on a gateway that relays authority edits, until dismissed or secured.
 */
export function useLiteSecurePrompt(identity: StoredLiteIdentity | null, available: boolean) {
  // null while no identity is known (also before hydration reads storage): only an identity seen
  // unregistered that turns registered is a first post.
  const registered = identity ? identity.registered : null;
  const previous = useRef(registered);
  const [prompting, setPrompting] = useState(false);

  useEffect(() => {
    if (registered === true && previous.current === false) setPrompting(true);
    previous.current = registered;
  }, [registered]);

  return {
    prompting: prompting && available && !!identity && !identity.secured,
    dismiss: () => setPrompting(false)
  };
}

/** The non-blocking card after a first post: the account lives only here; Secure it, or dismiss. */
export default function LiteSecurePrompt({
  onSecure,
  onDismiss
}: {
  onSecure: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation('common_blog');

  return (
    <div
      className="fixed bottom-4 left-4 z-50 flex max-w-sm flex-col gap-2 rounded-md border bg-background p-4 text-sm shadow-lg"
      role="status"
      data-testid="lite-secure-prompt"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold">{t('lite_account.passkey.prompt_title')}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('lite_account.passkey.prompt_dismiss')}
          data-testid="lite-secure-prompt-dismiss"
        >
          <Icons.close className="h-4 w-4" />
        </button>
      </div>
      <p>{t('lite_account.passkey.warning_unsecured')}</p>
      <Button
        type="button"
        size="sm"
        className="self-start"
        onClick={onSecure}
        data-testid="lite-secure-prompt-action"
      >
        {t('lite_account.passkey.secure_action')}
      </Button>
    </div>
  );
}
