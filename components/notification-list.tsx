import NotificationListItem from '@/components/notification-list-item';
import { AccountNotification } from '@/lib/bridge';

const NotificationList = ({ data }: { data: AccountNotification[] | null | undefined }) => {
  return (
    <ul className="ml-4 py-8">
      {data?.map((notification: AccountNotification, index: number) => (
        <NotificationListItem
          key={`${notification.id}-${notification.type}`}
          date={notification.date}
          msg={notification.msg}
          score={notification.score}
          type={notification.type}
          url={notification.url}
        />
      ))}
    </ul>
  );
};

export default NotificationList;
