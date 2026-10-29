import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import NotificationContent from './content';
import { getNotifications } from '@transaction/lib/lite-notifications-api';
import { getQueryClient } from '@/blog/lib/react-query';
import { extractNotificationsAccountFromParam } from '@/blog/lib/hive-account-route';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const NotificationsPage = async (props: { params: Promise<{ param: string }> }) => {
  const params = await props.params;
  const username = await extractNotificationsAccountFromParam(params.param);
  if (!username) notFound();

  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: ['AccountNotification', username],
      queryFn: () => getNotifications(username)
    });
  } catch (error) {
    logger.error(error, 'Error in NotificationsPage:');
  }

  const dehydratedState = dehydrate(queryClient);
  queryClient.clear();
  return (
    <HydrationBoundary state={dehydratedState}>
      <NotificationContent username={username} />
    </HydrationBoundary>
  );
};

export default NotificationsPage;
