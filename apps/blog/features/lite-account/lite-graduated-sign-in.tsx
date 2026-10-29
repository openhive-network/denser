'use client';

import { useState } from 'react';
import { Button } from '@ui/components/button';
import { siteConfig } from '@ui/config/site';
import { handleError } from '@ui/lib/handle-error';
import { usePasskeySignIn } from '@smart-signer/lib/auth/use-passkey-sign-in';
import { SignerError } from '@smart-signer/lib/passkey/signer-client';
import { useTranslation } from '@/blog/i18n/client';
import { liteAuthorityErrorKey } from './lite-authority-errors';

/**
 * "Sign in as @<account>" for the account a graduation just created: one click, through the
 * "Passkey signer" login type, with the signer and key the graduation remembered for it.
 */
export default function LiteGraduatedSignIn({ account, onSignedIn }: { account: string; onSignedIn: () => void }) {
  const { t } = useTranslation('common_blog');
  const signIn = usePasskeySignIn(siteConfig.loginAuthenticateOnBackend);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const click = async () => {
    setError(null);
    setPending(true);
    try {
      await signIn(account);
      onSignedIn();
    } catch (failure) {
      if (failure instanceof SignerError) setError(liteAuthorityErrorKey(failure));
      else handleError(failure);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <p className="text-sm text-destructive" role="alert" data-testid="lite-graduation-sign-in-error">
          {t(error)}
        </p>
      ) : null}
      <Button type="button" disabled={pending} onClick={() => void click()} data-testid="lite-graduation-sign-in">
        {t('lite_account.graduation.sign_in_as', { account })}
      </Button>
    </div>
  );
}
