import { getQueryClient } from '@/blog/lib/react-query';
import FollowersContent from './content';
import { getAccountFull, getFollowers } from '@transaction/lib/hive-api';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');
const FollowersPage = async ({ params }: { params: Promise<{ param: string }> }) => {
  const queryClient = getQueryClient();
  const { param } = await params;
  const username = param.replace('%40', '');

  try {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['profileData', username],
        queryFn: () => getAccountFull(username)
      }),
      queryClient.prefetchInfiniteQuery({
        queryKey: ['followersData', username],
        queryFn: ({ pageParam: lastId }: { pageParam?: string }) =>
          getFollowers({ account: username, start: lastId, type: 'blog', limit: 50 }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: Awaited<ReturnType<typeof getFollowers>>) => {
          return lastPage.length >= 50 ? lastPage[lastPage.length - 1].follower : undefined;
        }
      })
    ]);
  } catch (error) {
    logger.error(error, 'Error in FollowersPage:');
  }
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FollowersContent username={username} />
    </HydrationBoundary>
  );
};

export default FollowersPage;
