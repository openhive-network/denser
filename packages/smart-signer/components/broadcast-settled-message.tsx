'use client';

import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import type { BroadcastSettlement } from '@transaction/lib/unconfirmed-broadcasts';
import { TransactionIdLine } from '@smart-signer/components/transaction-id-line';

const MESSAGE_KEYS: Record<BroadcastSettlement, string> = {
  applied: 'request_error.settled_applied',
  expired: 'request_error.settled_expired',
  unknown: 'request_error.settled_unknown'
};

/**
 * Tells the user how a transaction that may still apply settled: a block included it, it expired without
 * one, so it can be sent again, or whether it applied could not be found out. Names the transaction.
 */
export function BroadcastSettledMessage({
  transactionId,
  settlement,
  explorerDomain
}: {
  transactionId: string;
  settlement: BroadcastSettlement;
  explorerDomain?: string;
}) {
  // The toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, ready } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  return (
    <div data-testid="broadcast-settled-message" data-settlement={settlement}>
      <p>{t(MESSAGE_KEYS[settlement])}</p>
      <TransactionIdLine
        transactionId={transactionId}
        explorerDomain={explorerDomain}
        testId="broadcast-settled-id"
      />
    </div>
  );
}
