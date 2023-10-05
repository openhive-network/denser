import { useQuery } from '@tanstack/react-query';

import { getAccountNotifications } from '@/blog/lib/bridge';
import LayoutProfile from '@/blog/components/common/profile-layout';
import NotificationActivities from '@/blog/components/notification-activities';
import { useSiteParams } from '@hive/ui/components/hooks/use-site-params';
import Loading from '@hive/ui/components/loading';

export default function UserNotifications() {
  const { username } = useSiteParams();
  const {
    isLoading,
    error,
    data
  } = useQuery(['accountNotification', username], () => getAccountNotifications(username), {
    enabled: !!username
  });

  if (isLoading) return <Loading loading={isLoading} />;

  return (
    <LayoutProfile>
      <div className="flex w-full flex-col">
        {data &&data.length>0?<NotificationActivities data={data} username={username} />: <div
                key="empty"
                className="px-4 py-6 mt-12 bg-green-100 dark:bg-slate-700 text-sm"
              >
                @{username} hasn&apos;t had any notifications yet.
              </div>}
      </div>
    </LayoutProfile>
  );
}
