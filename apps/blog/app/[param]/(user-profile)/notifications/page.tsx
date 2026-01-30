import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import NotificationContent from './content';
import { getAccountNotifications } from '@transaction/lib/bridge-api';
import { getQueryClient } from '@/blog/lib/react-query';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const NotificationsPage = async ({ params }: { params: Promise<{ param: string }> }) => {
  const { param } = await params;
  const username = param.replace('%40', '');

  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: ['AccountNotification', username],
      queryFn: () => getAccountNotifications(username)
    });
  } catch (error) {
    logger.error(error, 'Error in NotificationsPage:');
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NotificationContent username={username} />
    </HydrationBoundary>
  );
};

export default NotificationsPage;
