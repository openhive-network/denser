import type { IAccountNotification } from '@hive/common-hiveio-packages/wax';
import { handleError } from '@ui/lib/handle-error';
import { liteReadMarkerDate } from '@/blog/features/lite-account/lite-read-marker';
import { useLiteMarkNotificationsReadMutation } from '@/blog/features/lite-account/use-lite-mark-read-mutation';
import { useMarkAllNotificationsAsReadMutation } from './use-notifications-read-mutation';

/**
 * "Mark all as read" for the reader of the notifications: a Hive account broadcasts hivemind's
 * custom_json with the browser's time; the browser's lite identity relays `set_last_read` with the
 * date of the newest of `rows`. `available` is false for a lite identity whose gateway does not
 * relay `set_last_read`.
 */
export function useMarkAllRead(isLiteReader: boolean, rows: readonly IAccountNotification[] | null | undefined) {
  const hive = useMarkAllNotificationsAsReadMutation();
  const lite = useLiteMarkNotificationsReadMutation();
  const isPending = isLiteReader ? lite.isPending : hive.isPending;

  const markAll = async () => {
    if (isPending) return;
    if (isLiteReader) {
      // Failures toast and restore the count in the mutation itself.
      lite.mutate(liteReadMarkerDate(rows));
      return;
    }
    const myDate = new Date().toISOString();
    const date = myDate.slice(0, myDate.length - 5);
    try {
      await hive.mutateAsync({ date });
    } catch (error) {
      handleError(error, {
        method: 'markAllNotificationsAsRead',
        params: { date }
      });
    }
  };

  return { markAll, isPending, available: isLiteReader ? lite.available : true };
}
