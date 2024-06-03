import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/utils';
const logger = getLogger('app');

interface MarkAllNotificationsAsReadParams {
  date: string;
}

/**
 * Makes mark all notifications as read transaction.
 *
 * @export
 * @return {*}
 */
export function useMarkAllNotificationsAsReadMutation() {
  const markAllNotificationsAsReadMutation = useMutation({
    mutationFn: async (params: MarkAllNotificationsAsReadParams) => {
      const { date } = params;

      await transactionService.markAllNotificationAsRead(date, { observe: true });

      logger.info('Marked all notifications as read: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useMarkAllNotificationsAsReadMutation onSuccess data: %o', data);
    }
  });

  const markAllNotificationsAsRead = async (params: MarkAllNotificationsAsReadParams) => {
    try {
      await markAllNotificationsAsReadMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'markAllNotificationsAsRead', ...params });
    }
  };

  return { markAllNotificationsAsRead, markAllNotificationsAsReadMutation };
}
