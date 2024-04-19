import Link from 'next/link';
import { Icons } from '@hive/ui/components/icons';
import { Progress } from '@hive/ui/components/progress';
import { dateToFullRelative } from '@hive/ui/lib/parse-date';
import { IAccountNotificationEx } from '@transaction/lib/bridge';
import { useTranslation } from 'next-i18next';

const NotificationListItem = ({ date, msg, score, type, url, lastRead }: IAccountNotificationEx) => {
  const { t } = useTranslation('common_blog');
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

  const usernamePattern = /\B@[a-z0-9.-]+/gi;
  const mentions = msg.match(usernamePattern);
  const unRead = lastRead <= new Date(date).getTime();
  console.log('lastRead', lastRead);
  console.log('date', new Date(date).getTime());
  const participants = mentions
    ? mentions.map((m: string) => (
        <a key={m} href={'/' + m} data-testid="notification-account-icon-link">
          <img
            className="mr-3 h-[40px] w-[40px] rounded-3xl"
            height="40"
            width="40"
            src={`https://images.hive.blog/u/${m.substring(1)}/avatar/small`}
            alt={`${m} profile picture`}
          />
        </a>
      ))
    : null;

  return (
    <tr
      className="block w-full px-4 odd:bg-slate-200 odd:dark:bg-slate-900"
      data-testid="notification-list-item"
    >
      <td className="flex justify-between py-4">
        <div className="flex items-center">
          {unRead ? <span className="mr-2 h-2 w-2 rounded-full bg-red-600" /> : null}
          {participants}
          <div className="flex flex-col">
            <Link href={`/${url}`}>
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
          className="h-[10px] w-[60px] rounded text-red-600"
          data-testid="notification-progress-bar"
        />
      </td>
    </tr>
  );
};

export default NotificationListItem;
