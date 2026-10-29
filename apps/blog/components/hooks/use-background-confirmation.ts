import { useCallback } from 'react';
import type { TransactionBroadcastResult } from '@transaction/index';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { useTranslation } from '@/blog/i18n/client';

const logger = getLogger('app');

type ConfirmedOperation = 'comment' | 'vote';

/**
 * Follows a `confirmInBackground` broadcast: runs `onConfirmed` once a block includes the
 * transaction, and warns that the operation may not have been processed when none did in time.
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
            description: operation === 'comment' ? t('global.comment_not_confirmed') : t('global.vote_not_confirmed')
          });
        },
        // A node that cannot serve blocks says nothing about the transaction: no warning
        (error) => logger.error(error, 'Cannot confirm transaction %s', result.transactionId)
      );
    },
    [operation, t]
  );
}
