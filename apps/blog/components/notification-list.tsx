import NotificationListItem from '@/blog/components/notification-list-item';
import { AccountNotification } from '@ui/lib/bridge';

const NotificationList = ({ data }: { data: AccountNotification[] | null | undefined }) => {
  return (
    <table className="w-full py-8">
      <tbody>
        {data?.map((notification: AccountNotification, index: number) => (
          <NotificationListItem
            key={`${notification.id}-${notification.type}-${index}`}
            date={notification.date}
            msg={notification.msg}
            score={notification.score}
            type={notification.type}
            url={notification.url}
          />
        ))}
      </tbody>
    </table>
  );
};

export default NotificationList;
