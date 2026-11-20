'use client';

import { useCallback } from 'react';
import { toast } from '@ui/components/hooks/use-toast';
import { useTranslation } from '@/blog/i18n/client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { liteWalletFailureMessage } from './lite-wallet-errors';

/**
 * Explains a lite action that the Safe Storage unlock step stopped: toasts hb-auth's refusal in the
 * page's language (says nothing when the guest cancelled) and returns true; false for any other
 * failure, which the caller explains as before.
 */
export function useLiteWalletFailureToast() {
  const { t } = useTranslation('common_blog');
  // Loaded ahead of the toast, which may be the first on the page to need the namespace
  const { t: tSigner } = useTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  return useCallback(
    (error: unknown): boolean => {
      const message = liteWalletFailureMessage(error, tSigner);
      if (message === undefined) return false;
      if (message !== null) {
        toast({ title: t('lite_account.safe_storage.unlock_failed_title'), description: message, variant: 'destructive' });
      }
      return true;
    },
    [t, tSigner]
  );
}
