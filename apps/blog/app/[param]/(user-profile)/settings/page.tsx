import { getQueryClient } from '@/blog/lib/react-query';
import SettingsContent from './content';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getAccountFull } from '@transaction/lib/hive-api';
import { getFollowList } from '@transaction/lib/bridge-api';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const SettingsPage = async ({ params }: { params: { param: string } }) => {
  const username = params.param.replace('%40', '');
  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: ['muted', username],
      queryFn: () => getFollowList(username, 'muted')
    });
    await queryClient.prefetchQuery({
      queryKey: ['profileData', username],
      queryFn: () => getAccountFull(username)
    });
  } catch (error) {
    logger.error('Error in SettingsPage:', error);
  }

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <SettingsContent username={username} />
    </Hydrate>
  );
};

export default SettingsPage;
