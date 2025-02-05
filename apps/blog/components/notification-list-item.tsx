/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { Icons } from '@hive/ui/components/icons';
import { Progress } from '@hive/ui/components/progress';
import { dateToFullRelative } from '@hive/ui/lib/parse-date';
import { IAccountNotificationEx } from '@transaction/lib/bridge';
import { useTranslation } from 'next-i18next';
import { useSiteParams } from '@ui/components/hooks/use-site-params';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getLogger } from '@ui/lib/logging';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/components';
import env from '@beam-australia/react-env';
import Image from 'next/image';

const logger = getLogger('app');
const usernamePattern = /\B@[a-z0-9.-]+/gi;

const NotificationListItem = ({ date, msg, score, type, url, lastRead }: IAccountNotificationEx) => {
  const { t } = useTranslation('common_blog');
  const { username } = useSiteParams();
  const { user } = useUser();
  const isOwner = user.username === username;
  const mentions = msg.match(usernamePattern);
  const unRead = lastRead <= new Date(date).getTime();
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
    default:
      icon = <Icons.arrowUpCircle className="h-4 w-4" />;
  }
  const imageHosterUrl = env('IMAGES_ENDPOINT');
  const participants = mentions
    ? mentions.map((m: string) => (
        <a key={m} href={'/' + m} data-testid="notification-account-icon-link">
          <Avatar className="mr-3 h-[40px] w-[40px] rounded-3xl">
            <AvatarImage
              src={`${imageHosterUrl}u/${m.substring(1)}/avatar/small`}
              alt={`${m} profile picture`}
            />
            <AvatarFallback className="bg-transparent">
              <Image width={40} height={40} alt={`${m} profile picture`} src="/defaultavatar.png" />
            </AvatarFallback>
          </Avatar>
        </a>
      ))
    : null;
  const filteredUrl = type === 'follow' ? `/${url}` : url;
  return (
    <tr
      className="block w-full px-4 odd:bg-background even:bg-background-tertiary "
      data-testid="notification-list-item"
    >
      <td className="flex justify-between py-4">
        <div className="flex items-center">
          {unRead && isOwner ? <span className="mr-2 h-2 w-2 rounded-full bg-destructive" /> : null}
          {participants}
          <div className="flex flex-col">
            <Link href={filteredUrl}>
              <span className="" data-testid="notification-account-and-message">
                <strong data-testid="subscriber-name">{msg.split(' ')[0]}</strong>
                {mentions ? msg.split(new RegExp(`(${mentions[0]})`, 'gi'))[2] : null}
              </span>
            </Link>
            <span
              className="flex items-center gap-2 text-sm text-gray-400"
              data-testid="notification-timestamp"
            >
              {icon}
              {`${dateToFullRelative(date, t)}`}
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
