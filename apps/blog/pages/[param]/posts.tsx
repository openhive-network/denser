import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Entry, getAccountPosts, getPostsRanked } from '@/blog/lib/bridge';
import ProfileLayout from '@/blog/components/common/profile-layout';
import Loading from '@/blog/components/loading';
import { useSiteParams } from '@/blog/components/hooks/use-site-params';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@hive/ui/components/tabs';
import PostList from '@/blog/components/post-list';
import { useRouter } from 'next/router';
import RepliesList from '@/blog/components/replies-list';
import { getFeedHistory } from '@/blog/lib/hive';
import { PostSkeleton } from '@/blog/pages/[...param]';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { convertStringToBig } from '@/blog/lib/helpers';

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
    async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
      return await getAccountPosts(
        sort || 'trending',
        username,
        'hive.blog',
        pageParam?.author,
        pageParam?.permlink
      );
    },
    {
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.length > 0) {
          return {
            author: lastPage[lastPage.length - 1].author,
            permlink: lastPage[lastPage.length - 1].permlink
          };
        }
        if (lastPage === null) return undefined;
        return {
          author: '',
          permlink: ''
        };
      },

      enabled: Boolean(sort) && !!username
    }
  );

  const {
    data: historyFeedData,
    isLoading: historyFeedLoading,
    isFetching: historyFeedIsFetching,
    isError: historyFeedError
  } = useQuery(['feedHistory'], () => getFeedHistory());

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

  if (isLoading || historyFeedLoading) return <Loading loading={isLoading} />;
  const historyFeedArr = historyFeedData?.price_history || [];
  const price_per_hive = convertStringToBig(historyFeedArr[historyFeedArr.length - 1].base);
  const lastPageData = data?.pages[data?.pages.length - 1];
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
                {data.pages.map((page, index) => {
                  return page ? (
                    <PostList
                      data={page}
                      sort={sort}
                      key={`posts-${index}`}
                      price_per_hive={price_per_hive}
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
                    ) : data.pages.length > 1 && lastPageData && lastPageData.length > 0 ? (
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
                  return page ? <RepliesList data={page} key={`replies-${index}`} /> : null;
                })}
                <div>
                  <button
                    ref={ref}
                    onClick={() => fetchNextPage()}
                    disabled={!hasNextPage || isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <PostSkeleton />
                    ) : data.pages.length > 1 && lastPageData && lastPageData.length > 0 ? (
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
                      price_per_hive={price_per_hive}
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
                    ) : data.pages.length > 1 && lastPageData && lastPageData.length > 0 ? (
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
