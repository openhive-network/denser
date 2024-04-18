import NotificationListItem from '@/blog/components/notification-list-item';
import { IAccountNotification } from '@transaction/lib/bridge';
import { useState } from 'react';

const NotificationList = ({
  data,
  lastRead
}: {
  data: IAccountNotification[] | null | undefined;
  lastRead: string;
}) => {
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
            lastRead={lastRead}
          />
        ))}
      </tbody>
    </table>
  );
};

export default NotificationList;
