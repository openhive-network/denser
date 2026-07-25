'use client';

import NotificationActivities from '@/blog/features/activity-log/notification-content';
import { useTranslation } from '@/blog/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { getAccountNotifications } from '@transaction/lib/bridge-api';
import { Button } from '@ui/components/button';
import { CircleSpinner } from 'react-spinners-kit';

const NotificationContent = ({ username }: { username: string }) => {
  const { t } = useTranslation('common_blog');

  const { data, isError, isFetching, refetch } = useQuery({
    queryKey: ['AccountNotification', username],
    queryFn: () => getAccountNotifications(username),
    refetchOnMount: true,
    staleTime: 0
  });

  const hasNotifications = !!data && data.length > 0;

  return (
    <div className="flex w-full flex-col">
      {/*
        A failed refetch must never masquerade as fresh data. React Query keeps
        serving the last successful response, so without this notice the page
        silently renders an arbitrarily old list until some unrelated event
        (a window focus, a remount) happens to trigger a successful refetch.
      */}
      {isError ? (
        <div
          className="mt-4 flex flex-col items-center gap-2 border-2 border-solid border-destructive/40 bg-card-noContent px-4 py-3 text-sm md:flex-row md:justify-between"
          data-testid="notifications-refresh-error"
          role="status"
        >
          <span>
            {hasNotifications
              ? t('navigation.profile_notifications_tab_navbar.refresh_failed_showing_cached')
              : t('navigation.profile_notifications_tab_navbar.refresh_failed')}
          </span>
          <Button variant="redHover" disabled={isFetching} onClick={() => refetch()} className="w-28">
            {isFetching ? (
              <CircleSpinner loading={isFetching} size={18} color="#dc2626" />
            ) : (
              t('navigation.profile_notifications_tab_navbar.retry')
            )}
          </Button>
        </div>
      ) : null}

      {hasNotifications ? (
        <NotificationActivities data={data} username={username} />
      ) : isError ? null : (
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
