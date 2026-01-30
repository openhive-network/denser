import { getQueryClient } from '@/blog/lib/react-query';
import SettingsContent from './content';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getAccountFull } from '@transaction/lib/hive-api';
import { getFollowList } from '@transaction/lib/bridge-api';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const SettingsPage = async ({ params }: { params: Promise<{ param: string }> }) => {
  const { param } = await params;
  const username = param.replace('%40', '');
  const queryClient = getQueryClient();

  try {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['muted', username],
        queryFn: () => getFollowList(username, 'muted')
      }),
      queryClient.prefetchQuery({
        queryKey: ['profileData', username],
        queryFn: () => getAccountFull(username)
      })
    ]);
  } catch (error) {
    logger.error(error, 'Error in SettingsPage:');
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SettingsContent username={username} />
    </HydrationBoundary>
  );
};

export default SettingsPage;
