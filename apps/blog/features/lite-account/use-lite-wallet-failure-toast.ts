'use client';

import { useCallback } from 'react';
import { toast } from '@ui/components/hooks/use-toast';
import { useTranslation } from '@/blog/i18n/client';
import { liteWalletFailureMessage } from './lite-wallet-errors';

/**
 * Explains a lite action that the Safe Storage unlock step stopped: toasts hb-auth's message (says
 * nothing when the guest cancelled) and returns true; false for any other failure, which the caller
 * explains as before.
 */
export function useLiteWalletFailureToast() {
  const { t } = useTranslation('common_blog');
  return useCallback(
    (error: unknown): boolean => {
      const message = liteWalletFailureMessage(error);
      if (message === undefined) return false;
      if (message !== null) {
        toast({ title: t('lite_account.safe_storage.unlock_failed_title'), description: message, variant: 'destructive' });
      }
      return true;
    },
    [t]
  );
}
