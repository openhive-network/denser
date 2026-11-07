'use client';

import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { formatTime } from '@smart-signer/lib/format-time';
import { TransactionIdLine } from '@smart-signer/components/transaction-id-line';

/**
 * Tells the user their transaction was sent but a block has not been seen to include it yet, so it may
 * still apply, and names it, linked to `explorerDomain` when one is set, to check before retrying.
 * `message`, when given, replaces the generic text above the id. With the transaction's `expiration`, it
 * also says until when a block can include it.
 */
export function TransactionNotConfirmedMessage({
  transactionId,
  explorerDomain,
  message,
  expiration
}: {
  transactionId: string;
  explorerDomain?: string;
  message?: string;
  expiration?: Date;
}) {
  // The toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, ready, i18n } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  return (
    <div data-testid="transaction-not-confirmed-message">
      <p>{message ?? t('request_error.not_confirmed')}</p>
      {expiration ? (
        <p data-testid="transaction-not-confirmed-until">
          {t('request_error.pending_until', { time: formatTime(expiration, i18n.language) })}
        </p>
      ) : null}
      <TransactionIdLine
        transactionId={transactionId}
        explorerDomain={explorerDomain}
        testId="transaction-not-confirmed-id"
      />
    </div>
  );
}
