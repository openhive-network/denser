import { Icons } from '@hive/ui/components/icons';
import TimeAgo from '@hive/ui/components/time-ago';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/components/avatar';
import { IAccountNotification } from '@hive/common-hiveio-packages/wax';
import { getUserAvatarUrl, Link } from '@hive/ui';
import { cn } from '@ui/lib/utils';
import { getImageSrc } from '@ui/lib/path-utils';
import { useTranslation } from '@/blog/i18n/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import LiteDidBadge from '@/blog/features/lite-account/lite-did-badge';
import { authorDisplayName, isLiteDid } from '@/blog/features/lite-account/lite-did';
import { notificationSource } from './lib/notification-source';

/** Get icon and color based on notification type */
function getNotificationIcon(type: string) {
  switch (type) {
    case 'vote':
      return {
        icon: <Icons.arrowUpCircle className="h-4 w-4" />,
        color: 'text-green-600 dark:text-green-400'
      };
    case 'reblog':
      return {
        icon: <Icons.forward className="h-4 w-4" />,
        color: 'text-blue-600 dark:text-blue-400'
      };
    case 'reply':
    case 'reply_comment':
      return {
        icon: <Icons.comment className="h-4 w-4" />,
        color: 'text-purple-600 dark:text-purple-400'
      };
    case 'mention':
      return {
        icon: <Icons.atSign className="h-4 w-4" />,
        color: 'text-amber-600 dark:text-amber-400'
      };
    case 'follow':
      return {
        icon: <Icons.userPlus className="h-4 w-4" />,
        color: 'text-cyan-600 dark:text-cyan-400'
      };
    case 'error':
      return {
        icon: <Icons.settings className="h-4 w-4" />,
        color: 'text-red-600 dark:text-red-400'
      };
    default:
      return {
        icon: <Icons.info className="h-4 w-4" />,
        color: 'text-gray-500'
      };
  }
}

const NotificationListItem = ({
  date,
  msg,
  score,
  type,
  url,
  lastRead,
  isOwner
}: IAccountNotification & { lastRead: Date; isOwner: boolean }) => {
  const { t } = useTranslation('common_blog');

  const source = notificationSource(msg);
  const notificationDate = new Date(date);
  const { icon, color } = getNotificationIcon(type);
  const fixedUrl = url.startsWith('c') ? url.replace('c', 'trending') : url;
  const errorMessage = type === 'error';
  const isUnread = isOwner && notificationDate > lastRead;

  const avatarUsername = source?.account;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-background-secondary',
        isUnread && 'bg-destructive/5'
      )}
      data-testid="notification-list-item"
    >
      {/* Unread indicator */}
      {isUnread ? (
        <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
      ) : (
        <span className="h-2 w-2 shrink-0" />
      )}

      {/* Avatar for the user who triggered the notification, or fallback icon */}
      {avatarUsername ? (
        <Link href={`/@${avatarUsername}`} data-testid="notification-account-icon-link" className="shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={getUserAvatarUrl(avatarUsername, 'small')}
              alt={`${avatarUsername} profile picture`}
            />
            <AvatarFallback className="bg-transparent">
              <img
                className="h-10 w-10 rounded-full"
                alt={`${avatarUsername} profile picture`}
                src={getImageSrc('/defaultavatar.png')}
              />
            </AvatarFallback>
          </Avatar>
        </Link>
      ) : (
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background-tertiary',
            color
          )}
        >
          {icon}
        </div>
      )}

      {/* Message content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          href={`/${fixedUrl}`}
          className="line-clamp-2 text-sm hover:text-destructive visited:text-gray-500 dark:visited:text-gray-400"
        >
          <span data-testid="notification-account-and-message">
            {source && isLiteDid(source.account) ? (
              <>
                <strong data-testid="subscriber-name" translate="no">
                  @{authorDisplayName(source.account)}
                </strong>
                <LiteDidBadge />
              </>
            ) : (
              <strong data-testid="subscriber-name">{msg.split(' ')[0]}</strong>
            )}
            {source
              ? source.text
              : errorMessage
                ? msg.split('error:')[1]
                : null}
          </span>
        </Link>
        <span className="flex items-center gap-2 text-xs text-gray-500" data-testid="notification-timestamp">
          <span className={color}>{icon}</span>
          <TimeAgo date={date} />
        </span>
      </div>

      {/*
        The API's `score` field. This is not reputation. For votes hivemind
        computes it from payout and rshares; for other types it is derived
        from reputation data, but on a 0-100 scale that does not match the
        reputation shown elsewhere in the UI. Keep the label neutral.
      */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex shrink-0 items-center justify-center rounded-full bg-background-tertiary px-2 py-0.5 text-xs text-foreground/70"
              data-testid="notification-score-badge"
            >
              {score}
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{t('navigation.profile_notifications_tab_navbar.notification_score')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default NotificationListItem;
