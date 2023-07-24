import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Progress } from '@/components/ui/progress';
import { dateToRelative } from '@/lib/parse-date';
import { AccountNotification } from '@/lib/bridge';

const NotificationListItem = ({ date, msg, score, type, url }: AccountNotification) => {
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
  const participants = mentions
    ? mentions.map((m: string) => (
        <a key={m} href={'/' + m}>
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
    <tr className="block w-full px-4 odd:bg-slate-200 odd:dark:bg-slate-900">
      <td className="flex justify-between py-4">
        <div className="flex items-center">
          {participants}
          <div className="flex flex-col">
            <Link href={`/${url}`}>
              <span className="">
                <strong>{msg.split(' ')[0]}</strong>
                {mentions ? msg.split(new RegExp(`(${mentions[0]})`, 'gi'))[2] : null}
              </span>
            </Link>
            <span className="flex items-center gap-2 text-sm text-gray-400">
              {icon}
              {dateToRelative(date)}
            </span>
          </div>
        </div>
        <Progress value={score} className="h-[10px] w-[60px] rounded text-red-600" />
      </td>
    </tr>
  );
};

export default NotificationListItem;
