import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getLogger } from '@ui/lib/logging';
import { toast } from '@ui/components/hooks/use-toast';

const logger = getLogger('app');

/**
 * Makes mark all notifications as read transaction.
 *
 * @export
 * @return {*}
 */
export function useMarkAllNotificationsAsReadMutation() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const markAllNotificationsAsReadMutation = useMutation({
    mutationFn: async (params: { date: string }) => {
      const { date } = params;
      const broadcastResult = await transactionService.markAllNotificationAsRead(date, { observe: true });
      const response = { ...params, broadcastResult };
      return response;
    },
    onSettled: (data) => {
      queryClient.setQueryData(['unreadNotifications', user.username], {
        lastread: data?.date || new Date().toISOString(),
        unread: 0
      });
    },
    onSuccess: () => {
      const { username } = user;
      toast({
        title: 'Notifications marked as read',
        description: 'All notifications have been marked as read successfully.',
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['unreadNotifications', username] });
      }, 3000);
    }
  });

  return markAllNotificationsAsReadMutation;
}
