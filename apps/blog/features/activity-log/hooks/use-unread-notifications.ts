import { useQuery } from '@tanstack/react-query';
import { getNotificationsUnread } from '@transaction/lib/lite-notifications-api';

/** The react-query key of an account's unread count (a Hive name or a lite DID). */
export const unreadNotificationsKey = (account: string) => ['unreadNotifications', account] as const;

/**
 * The unread count and read marker of `account`, from `lite.unread_notifications` on a node serving
 * lite notifications, else `bridge.unread_notifications`; nothing without `account`.
 */
export function useUnreadNotifications(account: string | null | undefined, options: { refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: unreadNotificationsKey(account ?? ''),
    queryFn: () => getNotificationsUnread(account ?? ''),
    enabled: !!account,
    ...options
  });
}
