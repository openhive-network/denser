'use client';

import { useCallback } from 'react';
import { Button } from '@ui/components/button';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useLoginAuthority } from '@smart-signer/lib/auth/use-login-authority';
import { useAddSafeStorageKey } from '@smart-signer/lib/auth/use-add-safe-storage-key';
import { KeyType, type User } from '@smart-signer/types/common';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { useTranslation } from '@/wallet/i18n/client';
import DialogLogin from './dialog-login';

function NoticeContent({ sessionUser }: { sessionUser: User }) {
  const { t } = useTranslation('common_wallet');
  const { t: tSigner, ready } = useTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const authority = useLoginAuthority(sessionUser);
  const addKey = useAddSafeStorageKey(sessionUser);
  const addActiveKey = useCallback(() => addKey(KeyType.active), [addKey]);
  if (!ready) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-background-secondary px-4 py-2 text-sm"
      data-testid="active-key-required-notice"
    >
      <span>{tSigner('login_form.zod_error.posting_key_for_active')}</span>
      {authority.kind === 'key' && authority.canAddKey ? (
        <Button variant="redHover" size="sm" onClick={addActiveKey} data-testid="active-key-required-add-key">
          {t('navigation.user_menu.add_active_key')}
        </Button>
      ) : null}
      <DialogLogin>
        <Button variant="redHover" size="sm" data-testid="active-key-required-login">
          {t('navigation.main_nav_bar.login')}
        </Button>
      </DialogLogin>
    </div>
  );
}

/**
 * Shown while the session on this origin cannot sign with the active key: the wallet treats it as
 * logged out and offers to add the active key to safe storage, or to sign in with it.
 */
export function ActiveKeyRequiredNotice() {
  const { lacksRequiredKey, sessionUser } = useUserClient();
  // The smart-signer translations load only for the sessions that see the notice
  return lacksRequiredKey ? <NoticeContent sessionUser={sessionUser} /> : null;
}
