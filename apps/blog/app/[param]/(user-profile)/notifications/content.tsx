'use client';

import NotificationActivities from '@/blog/features/activity-log/notification-content';
import { useTranslation } from '@/blog/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { getAccountNotifications } from '@transaction/lib/bridge-api';

const NotificationContent = ({ username }: { username: string }) => {
  const { t } = useTranslation('common_blog');

  const { data } = useQuery({
    queryKey: ['AccountNotification', username],
    queryFn: () => getAccountNotifications(username)
  });

  return (
    <div className="flex w-full flex-col">
      {data && data.length > 0 ? (
        <NotificationActivities data={data} username={username} />
      ) : (
        <div
          key="empty"
          className="border-card-empty-border mt-12 border-2 border-solid bg-card-noContent px-4 py-6 text-sm"
          data-testid="user-has-not-had-any-notifications-yet"
        >
          {t('user_profile.no_notifications_yet', { username: username })}
        </div>
      )}
    </div>
  );
};

export default NotificationContent;
