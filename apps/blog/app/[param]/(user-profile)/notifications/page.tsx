import { dehydrate, Hydrate } from '@tanstack/react-query';
import NotificationContent from './content';
import { getAccountNotifications } from '@transaction/lib/bridge-api';
import { getQueryClient } from '@/blog/lib/react-query';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const NotificationsPage = async ({ params }: { params: { param: string } }) => {
  const username = extractUsernameFromParam(params.param);
  if (!username) notFound();

  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: ['AccountNotification', username],
      queryFn: () => getAccountNotifications(username)
    });
  } catch (error) {
    logger.error(error, 'Error in NotificationsPage:');
  }

  const dehydratedState = dehydrate(queryClient);
  queryClient.clear();
  return (
    <Hydrate state={dehydratedState}>
      <NotificationContent username={username} />
    </Hydrate>
  );
};

export default NotificationsPage;
