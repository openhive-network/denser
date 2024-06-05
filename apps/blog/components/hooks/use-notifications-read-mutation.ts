import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes mark all notifications as read transaction.
 *
 * @export
 * @return {*}
 */
export function useMarkAllNotificationsAsReadMutation() {
  const markAllNotificationsAsReadMutation = useMutation({
    mutationFn: async (params: { date: string }) => {
      const { date } = params;
      const broadcastResult = await transactionService.markAllNotificationAsRead(date, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done mark all notifications as read transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useMarkAllNotificationsAsReadMutation onSuccess data: %o', data);
    }
  });

  return markAllNotificationsAsReadMutation;
}
