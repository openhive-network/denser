import NotificationListItem from '@/blog/components/notification-list-item';
import { AccountNotification } from '@/blog/lib/bridge';

const NotificationList = ({ data }: { data: AccountNotification[] | null | undefined }) => {
  return (
    <table className="ml-4 py-8 w-full">
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
