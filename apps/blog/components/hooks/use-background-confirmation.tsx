import { useCallback } from 'react';
import env from '@beam-australia/react-env';
import type { TransactionBroadcastResult } from '@transaction/index';
import { TransactionNotConfirmedMessage } from '@smart-signer/components/transaction-not-confirmed-message';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { useTranslation } from '@/blog/i18n/client';

const logger = getLogger('app');

type ConfirmedOperation = 'comment' | 'vote';

/**
 * Follows a `confirmInBackground` broadcast: runs `onConfirmed` once a block includes the
 * transaction, and warns that the operation may not have been processed when none of the blocks
 * scanned in time did, naming the transaction to check on the explorer before retrying.
 */
export function useBackgroundConfirmation(operation: ConfirmedOperation) {
  const { t } = useTranslation('common_blog');

  return useCallback(
    (result: TransactionBroadcastResult, onConfirmed?: () => void) => {
      result.included?.then(
        (included) => {
          if (included) {
            onConfirmed?.();
            return;
          }
          logger.warn('Transaction %s not seen in a block in time', result.transactionId);
          toast({
            title: t('global.not_confirmed'),
            description: (
              <TransactionNotConfirmedMessage
                transactionId={result.transactionId}
                explorerDomain={env('EXPLORER_DOMAIN')}
                expiration={result.expiration}
                message={
                  operation === 'comment' ? t('global.comment_not_confirmed') : t('global.vote_not_confirmed')
                }
              />
            )
          });
        },
        // No block could be scanned, which says nothing about the transaction: no warning
        (error) => logger.error(error, 'Cannot confirm transaction %s', result.transactionId)
      );
    },
    [operation, t]
  );
}
