'use client';

import { Button } from '@ui/components/button';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { useTranslation } from '@/wallet/i18n/client';
import DialogLogin from './dialog-login';

function NoticeContent() {
  const { t } = useTranslation('common_wallet');
  const { t: tSigner, ready } = useTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-background-secondary px-4 py-2 text-sm"
      data-testid="active-key-required-notice"
    >
      <span>{tSigner('login_form.zod_error.posting_key_for_active')}</span>
      <DialogLogin>
        <Button variant="redHover" size="sm" data-testid="active-key-required-login">
          {t('navigation.main_nav_bar.login')}
        </Button>
      </DialogLogin>
    </div>
  );
}

/**
 * Shown while the session on this origin was signed in with a posting key: the wallet treats it as
 * logged out and asks for the active key instead.
 */
export function ActiveKeyRequiredNotice() {
  const { lacksRequiredKey } = useUserClient();
  // The smart-signer translations load only for the sessions that see the notice
  return lacksRequiredKey ? <NoticeContent /> : null;
}
