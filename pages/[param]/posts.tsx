import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Entry, getAccountPosts, getPostsRanked } from '@/lib/bridge';
import ProfileLayout from '@/components/common/profile-layout';
import Loading from '@/components/loading';
import { useSiteParams } from '@/components/hooks/use-site-params';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PostList from '@/components/post-list';
import { useRouter } from 'next/router';
import RepliesList from '@/components/replies-list';
import { getFeedHistory } from '@/lib/hive';
import { PostSkeleton } from '@/pages/[...param]';
import { useInView } from 'react-intersection-observer';

const UserPosts = () => {
  const router = useRouter();
  const { username } = useSiteParams();
  const { ref, inView } = useInView();
  const sort = router.pathname.split('/')[router.pathname.split('/').length - 1];

  const {
    data,
    isLoading,
    isFetching,
    error,
    isError,
    status,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage
  } = useInfiniteQuery(
    ['accountRepliesInfinite', username, sort],
    async ({ pageParam }: { pageParam?: any }): Promise<any> => {
      return await getAccountPosts(
        sort || 'trending',
        username,
        'hive.blog',
        pageParam?.author,
        pageParam?.permlink
      );
    },
    {
      getNextPageParam: (lastPage: Entry[]) => {
        return {
          author: lastPage && lastPage.length > 0 ? lastPage[lastPage?.length - 1].author : '',
          permlink: lastPage && lastPage.length > 0 ? lastPage[lastPage?.length - 1].permlink : ''
        };
      },
      enabled: Boolean(sort)
    }
  );

  const {
    data: historyFeedData,
    isLoading: historyFeedLoading,
    isFetching: historyFeedIsFetching,
    isError: historyFeedError
  } = useQuery(['feedHistory'], () => getFeedHistory());

  if (isLoading || historyFeedLoading) return <Loading loading={isLoading} />;

  return (
    <ProfileLayout>
      <div className="flex flex-col">
        <Tabs defaultValue={sort} className="w-full" onValueChange={(s) => router.push(`/@${username}/${s}`)}>
          <TabsList className="flex" data-testid="user-post-menu">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="payout">Payouts</TabsTrigger>
          </TabsList>
          <TabsContent value="posts">
            {!isLoading && data ? (
              <>
                {console.log(
                  'data?.pages[data.pages.length - 1].length',
                  data?.pages[data.pages.length - 1].length
                )}
                {data.pages.map((page, index) => {
                  return page ? (
                    <PostList
                      data={page}
                      sort={sort}
                      key={`posts-${index}`}
                      historyFeedData={historyFeedData}
                    />
                  ) : null;
                })}
                <div>
                  <button
                    ref={ref}
                    onClick={() => fetchNextPage()}
                    disabled={!hasNextPage || isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <PostSkeleton />
                    ) : data.pages.length > 1 && data?.pages[data.pages.length - 1].length > 0 ? (
                      'Load Newer'
                    ) : null}
                  </button>
                </div>
                <div>{isFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
              </>
            ) : null}
          </TabsContent>
          <TabsContent value="comments">
            {!isLoading && data ? (
              <>
                {data.pages.map((page, index) => {
                  return page ? <RepliesList data={page} /> : null;
                })}
                <div>
                  <button
                    ref={ref}
                    onClick={() => fetchNextPage()}
                    disabled={!hasNextPage || isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <PostSkeleton />
                    ) : data.pages.length > 1 && data?.pages[data.pages.length - 1].length > 0 ? (
                      'Load Newer'
                    ) : null}
                  </button>
                </div>
                <div>{isFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
              </>
            ) : null}
          </TabsContent>
          <TabsContent value="payout">
            {!isLoading && data ? (
              <>
                {data.pages.map((page, index) => {
                  return page ? (
                    <PostList
                      data={page}
                      sort={sort}
                      key={`payout-${index}`}
                      historyFeedData={historyFeedData}
                    />
                  ) : null;
                })}
                <div>
                  <button
                    ref={ref}
                    onClick={() => fetchNextPage()}
                    disabled={!hasNextPage || isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <PostSkeleton />
                    ) : data.pages.length > 1 && data?.pages[data.pages.length - 1].length > 0 ? (
                      'Load Newer'
                    ) : null}
                  </button>
                </div>
                <div>{isFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
              </>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </ProfileLayout>
  );
};

export default UserPosts;
