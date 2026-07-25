import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { toast } from '@ui/components/hooks/use-toast';
import { handleError } from '@ui/lib/handle-error';
import { IUnreadNotifications } from '@hive/common-hiveio-packages/wax';
import { getUnreadNotifications } from '@transaction/lib/bridge-api';
import { scheduleValidatedRefetch } from '@/blog/lib/react-query';

/**
 * Naive-UTC timestamp, matching the shape the bridge API uses for both
 * `unread_notifications.lastread` and each notification's `date`. Readers
 * compare these with `new Date(...)`, so every value in that comparison must
 * carry the same (absent) zone marker or the offsets will not line up.
 */
const naiveUtcNow = (): string => new Date().toISOString().slice(0, -5);

/**
 * Makes mark all notifications as read transaction.
 *
 * @export
 * @return {*}
 */
export function useMarkAllNotificationsAsReadMutation() {
  const queryClient = useQueryClient();
  const { user } = useUserClient();
  const markAllNotificationsAsReadMutation = useMutation({
    mutationFn: async (params: { date: string }) => {
      const { date } = params;
      const broadcastResult = await transactionService.markAllNotificationAsRead(date, { observe: true });
      const response = { ...params, broadcastResult };
      return response;
    },
    onSettled: (data) => {
      // The field is `lastread` (all lowercase) - see IUnreadNotifications and
      // every reader of this cache entry. Typing the write keeps it that way:
      // a mismatched key silently turned this optimistic update into a no-op.
      queryClient.setQueryData<IUnreadNotifications>(['unreadNotifications', user.username], {
        lastread: data?.date || naiveUtcNow(),
        unread: 0
      });
    },
    onSuccess: (_data, variables) => {
      const { username } = user;
      toast({
        title: 'Notifications marked as read',
        description: 'All notifications have been marked as read successfully.',
        variant: 'success'
      });
      // Hivemind indexes the read marker some seconds after the transaction is
      // on-chain. A blind invalidate can land inside that window and overwrite
      // the optimistic value with a pre-mark `lastread`, which makes every
      // already-read notification light up as unread again. Only accept a
      // response that actually reflects the mark we just broadcast.
      const markedAt = new Date(variables.date).getTime();
      scheduleValidatedRefetch<IUnreadNotifications | null>(
        queryClient,
        ['unreadNotifications', username],
        () => getUnreadNotifications(username),
        (fresh) => !!fresh?.lastread && new Date(fresh.lastread).getTime() >= markedAt
      );
    },
    onError: (error: any, variables) => {
      handleError(error, {
        method: 'useMarkAllNotificationsAsReadMutation',
        params: variables
      });
    }
  });

  return markAllNotificationsAsReadMutation;
}
