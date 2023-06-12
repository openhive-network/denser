import { useQuery } from '@tanstack/react-query';

import { getAccountNotifications } from '@/lib/bridge';
import LayoutProfile from '@/components/common/profile-layout';
import NotificationActivities from '@/components/notification-activities';
import { useSiteParams } from '@/components/hooks/use-site-params';
import Loading from '@/components/loading';
import Layout from '@/components/common/layout';

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
