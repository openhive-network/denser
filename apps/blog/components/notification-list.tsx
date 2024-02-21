import NotificationListItem from '@/blog/components/notification-list-item';
import { IAccountNotification } from '@transaction/lib/bridge';

const NotificationList = ({ data }: { data: IAccountNotification[] | null | undefined }) => {
  return (
    <table className="w-full py-8">
      <tbody>
        {data?.map((notification: IAccountNotification, index: number) => (
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
