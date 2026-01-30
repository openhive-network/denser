import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import FollowedContent from './content';
import { getAccountFull, getFollowing } from '@transaction/lib/hive-api';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const FollowedUsersPage = async ({ params }: { params: Promise<{ param: string }> }) => {
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
        queryKey: ['followingData', username],
        queryFn: ({ pageParam: lastId }: { pageParam?: string }) => getFollowing({ account: username, start: lastId, limit: 50 }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: Awaited<ReturnType<typeof getFollowing>>) => {
          return lastPage.length >= 50 ? lastPage[lastPage.length - 1].following : undefined;
        }
      })
    ]);
  } catch (error) {
    logger.error(error, 'Error in FollowedUsersPage:');
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FollowedContent username={username} />
    </HydrationBoundary>
  );
};

export default FollowedUsersPage;
