import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { IUnreadNotifications } from '@hive/common-hiveio-packages/wax';
import { getUnreadNotifications } from '@transaction/lib/bridge-api';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { scheduleValidatedRefetch } from '@/blog/lib/react-query';

/**
 * Naive-UTC timestamp, matching the shape the bridge API uses for both
 * `unread_notifications.lastread` and each notification's `date`. Readers
 * compare these with `new Date(...)`, so every value in that comparison must
 * carry the same (absent) zone marker or the offsets will not line up.
 */
const naiveUtcNow = (): string => new Date().toISOString().slice(0, -5);

export function useMarkAllNotificationsAsReadMutation() {
  const { username } = useUserClient().user;
  const queryKey = ['unreadNotifications', username];
  return useOperationMutation({
    name: 'useMarkAllNotificationsAsReadMutation',
    // The field is `lastread` (all lowercase) - see IUnreadNotifications and
    // every reader of this cache entry. Typing the write keeps it that way:
    // a mismatched key silently turned this optimistic update into a no-op.
    optimistic: async (params: { date: string }, queryClient) => {
      await queryClient.cancelQueries({ queryKey });
      const prevUnread = queryClient.getQueryData<IUnreadNotifications>(queryKey);
      queryClient.setQueryData<IUnreadNotifications>(queryKey, {
        lastread: params.date || naiveUtcNow(),
        unread: 0
      });
      return { prevUnread };
    },
    rollback: (context, _params, queryClient) => {
      if (context?.prevUnread) queryClient.setQueryData(queryKey, context.prevUnread);
    },
    run: ({ date }: { date: string }) => transactionService.markAllNotificationAsRead(date, OBSERVE),
    onSuccess: (_data, { date }, queryClient) => {
      // Hivemind indexes the read marker some seconds after the transaction is
      // on-chain. A blind invalidate can land inside that window and overwrite
      // the optimistic value with a pre-mark `lastread`, which makes every
      // already-read notification light up as unread again. Only accept a
      // response that actually reflects the mark we just broadcast.
      const markedAt = new Date(date).getTime();
      scheduleValidatedRefetch<IUnreadNotifications | null>(
        queryClient,
        queryKey,
        () => getUnreadNotifications(username),
        (fresh) => !!fresh?.lastread && new Date(fresh.lastread).getTime() >= markedAt
      );
    },
    successToast: () => ({
      title: 'Notifications marked as read',
      description: 'All notifications have been marked as read successfully.'
    })
  });
}
