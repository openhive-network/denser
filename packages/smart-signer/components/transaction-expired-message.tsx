'use client';

import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import type { TransactionExpirationRejection } from '@transaction/lib/transaction-expired';

const MESSAGE_KEYS: Record<TransactionExpirationRejection, string> = {
  expired: 'broadcast_error.transaction_expired',
  too_far_ahead: 'broadcast_error.transaction_expiration_too_far_ahead'
};

/**
 * Tells the user the node rejected their transaction's expiration, so nothing was sent: it expired before
 * it was approved, or it was set too far ahead (check the device clock), and to try again.
 */
export function TransactionExpiredMessage({ rejection }: { rejection: TransactionExpirationRejection }) {
  // The error toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, ready } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  return (
    <p className="font-semibold text-white" data-testid="transaction-expired-message">
      {t(MESSAGE_KEYS[rejection])}
    </p>
  );
}
