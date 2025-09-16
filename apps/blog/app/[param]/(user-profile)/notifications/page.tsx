import { dehydrate, Hydrate } from '@tanstack/react-query';
import NotificationContent from './content';
import { getAccountNotifications } from '@transaction/lib/bridge-api';
import { getQueryClient } from '@/blog/lib/react-query';

const NotificationsPage = async ({ params }: { params: { param: string } }) => {
  const username = params.param.replace('%40', '');

  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['AccountNotification', username],
    queryFn: () => getAccountNotifications(username)
  });

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <NotificationContent username={username} />
    </Hydrate>
  );
};

export default NotificationsPage;
