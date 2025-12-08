import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import FollowedContent from './content';
import { getAccountFull, getFollowing } from '@transaction/lib/hive-api';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const FollowedUsersPage = async ({ params }: { params: { param: string } }) => {
  const queryClient = getQueryClient();
  const username = params.param.replace('%40', '');

  try {
    await queryClient.prefetchQuery({
      queryKey: ['profileData', username],
      queryFn: () => getAccountFull(username)
    });
    await queryClient.prefetchInfiniteQuery({
      queryKey: ['followingData', username],
      queryFn: ({ pageParam: last_id }) => getFollowing({ account: username, start: last_id, limit: 50 }),
      getNextPageParam: (lastPage) => {
        return lastPage.length >= 50 ? lastPage[lastPage.length - 1].following : undefined;
      }
    });
  } catch (error) {
    logger.error(error, 'Error in FollowedUsersPage:');
  }

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <FollowedContent username={username} />
    </Hydrate>
  );
};

export default FollowedUsersPage;
