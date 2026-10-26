'use client';

import NotificationListItem from './list-item';
import { IAccountNotification } from '@hive/common-hiveio-packages/wax';

const NotificationList = ({
  data,
  lastRead,
  isOwner
}: {
  data: IAccountNotification[] | null | undefined;
  lastRead: Date;
  /** Whether the reader owns these notifications: only then are unread ones marked. */
  isOwner: boolean;
}) => {
  return (
    <div className="flex flex-col divide-y divide-border-secondary">
      {data?.map((notification: IAccountNotification, index: number) => (
        <NotificationListItem
          key={`${notification.id}-${notification.type}-${index}`}
          date={notification.date}
          msg={notification.msg}
          score={notification.score}
          type={notification.type}
          url={notification.url}
          lastRead={lastRead}
          isOwner={isOwner}
        />
      ))}
    </div>
  );
};

export default NotificationList;
