import { Icons } from '@hive/ui/components/icons';
import { Progress } from '@hive/ui/components/progress';
import TimeAgo from '@hive/ui/components/time-ago';
import { configuredImagesEndpoint } from '@hive/ui/config/public-vars';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/components/avatar';
import { IAccountNotification } from '@transaction/lib/extended-hive.chain';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const usernamePattern = /\B@[a-z0-9.-]+/gi;

const NotificationListItem = ({
  date,
  msg,
  score,
  type,
  url,
  lastRead
}: IAccountNotification & { lastRead: Date }) => {
  const pathname = usePathname();
  const username = pathname?.split('/')[1].replace('@', '') || '';
  const { user } = useUserClient();

  const mentions = msg.match(usernamePattern);
  const notificationDate = new Date(date);
  let icon;

  switch (type) {
    case 'vote':
      icon = <Icons.arrowUpCircle className="h-4 w-4" />;
      break;
    case 'reblog':
      icon = <Icons.forward className="h-4 w-4" />;
      break;
    case 'reply_comment':
      icon = <Icons.comment className="h-4 w-4" />;
      break;
    case 'mention':
      icon = <Icons.atSign className="h-4 w-4" />;
      break;
    case 'error':
      icon = <Icons.settings className="h-4 w-4" />;
      break;
    default:
      icon = <Icons.arrowUpCircle className="h-4 w-4" />;
  }
  const imageHosterUrl = configuredImagesEndpoint;
  const fixedUrl = url.startsWith('c') ? url.replace('c', 'trending') : url;
  const errorMessage = type === 'error';
  const isOwner = user.isLoggedIn && user.username === username;
  const participants = mentions
    ? mentions.map((m: string) => {
        return (
          <Link key={m} href={`/${m}`} data-testid="notification-account-icon-link">
            <Avatar className="mr-3 h-[40px] w-[40px] rounded-3xl">
              <AvatarImage
                src={`${imageHosterUrl}u/${m.substring(1)}/avatar/small`}
                alt={`${m} profile picture`}
              />
              <AvatarFallback className="bg-transparent">
                <img
                  className="h-10 w-10 rounded-full"
                  alt={`${m} profile picture`}
                  src="/defaultavatar.png"
                />
              </AvatarFallback>
            </Avatar>
          </Link>
        );
      })
    : null;

  return (
    <tr
      className="block w-full px-4 odd:bg-background even:bg-background-tertiary "
      data-testid="notification-list-item"
    >
      <td className="flex justify-between py-4">
        <div className="flex items-center">
          {isOwner && notificationDate > lastRead ? (
            <span className="mr-2 h-2 w-2 rounded-full bg-destructive" />
          ) : null}
          {participants}
          <div className="flex flex-col">
            <Link href={`/${fixedUrl}`} className="visited:text-gray-500 dark:visited:text-gray-400">
              <span data-testid="notification-account-and-message">
                <strong data-testid="subscriber-name">{msg.split(' ')[0]}</strong>
                {mentions
                  ? msg.split(new RegExp(`(${mentions[0]})`, 'gi'))[2]
                  : errorMessage
                    ? msg.split('error:')[1]
                    : null}
              </span>
            </Link>
            <span
              className="flex items-center gap-2 text-sm text-gray-400"
              data-testid="notification-timestamp"
            >
              {icon}
              <TimeAgo date={date} />
            </span>
          </div>
        </div>
        <Progress
          value={score}
          className="h-[10px] w-[60px] rounded text-destructive"
          data-testid="notification-progress-bar"
        />
      </td>
    </tr>
  );
};

export default NotificationListItem;
