import { useQuery } from '@tanstack/react-query';

import { getAccountNotifications } from '@/blog/lib/bridge';
import LayoutProfile from '@/blog/components/common/profile-layout';
import NotificationActivities from '@/blog/components/notification-activities';
import { useSiteParams } from '@hive/ui/components/hooks/use-site-params';
import Loading from '@hive/ui/components/loading';

export default function UserNotifications() {
  const { username } = useSiteParams();
  const {
    isLoading: accountNotificationIsLoading,
    error: AccountNotificationError,
    data: dataAccountNotification
  } = useQuery(['accountNotification', username], () => getAccountNotifications(username), {
    enabled: !!username
  });

  if (accountNotificationIsLoading) return <Loading loading={accountNotificationIsLoading} />;

  return (
    <LayoutProfile>
      <div className="flex w-full flex-col">
        <NotificationActivities data={dataAccountNotification} username={username} />
      </div>
    </LayoutProfile>
  );
}
