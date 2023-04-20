import NotificationListItem from '@/components/notification-list-item';

const NotificationList = ({ data }: { data: any }) => {
  return (
    <ul className="ml-4 py-8">
      {data?.map((notification: any, index: number) => (
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
