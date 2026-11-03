'use client';

import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

/** Tells the user their transaction expired before it was approved, so nothing was sent, and to try again. */
export function TransactionExpiredMessage() {
  // The error toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, ready } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  return (
    <p className="font-semibold text-white" data-testid="transaction-expired-message">
      {t('broadcast_error.transaction_expired')}
    </p>
  );
}
