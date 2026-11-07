'use client';

import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

/** Names a transaction by its id, linked to `explorerDomain` when one is set; `testId` marks the id. */
export function TransactionIdLine({
  transactionId,
  explorerDomain,
  testId
}: {
  transactionId: string;
  explorerDomain?: string;
  testId: string;
}) {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  return (
    <p className="break-all">
      {t('request_error.transaction_id')}{' '}
      {explorerDomain ? (
        <a
          href={`${explorerDomain}/tx/${transactionId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
          data-testid={testId}
        >
          {transactionId}
        </a>
      ) : (
        <span data-testid={testId}>{transactionId}</span>
      )}
    </p>
  );
}
