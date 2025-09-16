import { getQueryClient } from '@/blog/lib/react-query';
import SettingsContent from './content';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getAccountFull } from '@transaction/lib/hive-api';
import { getFollowList } from '@transaction/lib/bridge-api';

const SettingsPage = async ({ params }: { params: { param: string } }) => {
  const username = params.param.replace('%40', '');
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['muted', username],
    queryFn: () => getFollowList(username, 'muted')
  });
  await queryClient.prefetchQuery({
    queryKey: ['profileData', username],
    queryFn: () => getAccountFull(username)
  });

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <SettingsContent username={username} />
    </Hydrate>
  );
};

export default SettingsPage;
