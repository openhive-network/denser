import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import FollowedContent from './content';
import { getAccountFull, getFollowing } from '@transaction/lib/hive-api';

const FollowedUsersPage = async ({ params }: { params: { param: string } }) => {
  const queryClient = getQueryClient();
  const username = params.param.replace('%40', '');

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

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <FollowedContent username={username} />
    </Hydrate>
  );
};

export default FollowedUsersPage;
