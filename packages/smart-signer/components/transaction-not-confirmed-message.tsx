'use client';

import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

/**
 * Tells the user their transaction was sent but a block has not been seen to include it yet, so it may
 * still apply, and names it, linked to `explorerDomain` when one is set, to check before retrying.
 */
export function TransactionNotConfirmedMessage({
  transactionId,
  explorerDomain
}: {
  transactionId: string;
  explorerDomain?: string;
}) {
  // The toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, ready } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  return (
    <div data-testid="transaction-not-confirmed-message">
      <p>{t('request_error.not_confirmed')}</p>
      <p className="break-all">
        {t('request_error.transaction_id')}{' '}
        {explorerDomain ? (
          <a
            href={`${explorerDomain}/transaction/${transactionId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            data-testid="transaction-not-confirmed-id"
          >
            {transactionId}
          </a>
        ) : (
          <span data-testid="transaction-not-confirmed-id">{transactionId}</span>
        )}
      </p>
    </div>
  );
}
