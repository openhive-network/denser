'use client';

import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { formatTime } from '@smart-signer/lib/format-time';
import type { EarlierBroadcastState } from '@transaction/lib/unconfirmed-broadcasts';
import { TransactionNotConfirmedMessage } from '@smart-signer/components/transaction-not-confirmed-message';

const MESSAGE_KEYS: Record<EarlierBroadcastState, string> = {
  may_still_apply: 'request_error.earlier_may_still_apply',
  applied: 'request_error.earlier_applied'
};

/**
 * Tells the user their transaction was not sent because an identical one sent earlier may still apply
 * (until its `expiration`) or has applied, and names that earlier transaction to check.
 */
export function EarlierBroadcastPendingMessage({
  transactionId,
  state,
  expiration,
  explorerDomain
}: {
  transactionId: string;
  state: EarlierBroadcastState;
  expiration: Date;
  explorerDomain?: string;
}) {
  // The toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, ready, i18n } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  return (
    <TransactionNotConfirmedMessage
      transactionId={transactionId}
      explorerDomain={explorerDomain}
      message={t(MESSAGE_KEYS[state], { time: formatTime(expiration, i18n.language) })}
    />
  );
}
