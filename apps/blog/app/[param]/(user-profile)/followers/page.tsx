import { getQueryClient } from '@/blog/lib/react-query';
import FollowersContent from './content';
import { getAccountFull, getFollowers } from '@transaction/lib/hive-api';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');
const FollowersPage = async ({ params }: { params: { param: string } }) => {
  const queryClient = getQueryClient();
  const username = params.param.replace('%40', '');

  try {
    await queryClient.prefetchQuery({
      queryKey: ['profileData', username],
      queryFn: () => getAccountFull(username)
    });

    await queryClient.prefetchInfiniteQuery({
      queryKey: ['followersData', username],
      queryFn: ({ pageParam: last_id }) =>
        getFollowers({ account: username, start: last_id, type: 'blog', limit: 50 }),
      getNextPageParam: (lastPage) => {
        return lastPage.length >= 50 ? lastPage[lastPage.length - 1].follower : undefined;
      }
    });
  } catch (error) {
    logger.error(error, 'Error in FollowersPage:');
  }
  return (
    <Hydrate state={dehydrate(queryClient)}>
      <FollowersContent username={username} />
    </Hydrate>
  );
};

export default FollowersPage;
