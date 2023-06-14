import { useSiteParams } from '@/components/hooks/use-site-params';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Entry, getAccountPosts, getCommunity, getPostsRanked } from '@/lib/bridge';
import Loading from '@/components/loading';
import { FC, useCallback, useEffect } from 'react';
import PostList from '@/components/post-list';
import { Skeleton } from '@/components/ui/skeleton';
import CommunitiesSidebar from '@/components/communities-sidebar';
import PostSelectFilter from '@/components/post-select-filter';
import { useRouter } from 'next/router';
import ExploreHive from '@/components/explore-hive';
import ProfileLayout from '@/components/common/profile-layout';
import CommunityDescription from '@/components/community-description';
import { useInView } from 'react-intersection-observer';
import CustomError from '@/components/custom-error';
import { getFeedHistory } from '@/lib/hive';
import CommunitySimpleDescription from '@/components/community-simple-description';

export const PostSkeleton = () => {
  return (
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  );
};

const ParamPage: FC = () => {
  const router = useRouter();
  const { sort, username, tag } = useSiteParams();
  const { ref, inView } = useInView();
  const { ref: refAcc, inView: inViewAcc } = useInView();

  const {
    data: entriesData,
    isLoading: entriesDataIsLoading,
    isFetching: entriesDataIsFetching,
    error: entriesDataError,
    isError: entriesDataIsError,
    status,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage
  } = useInfiniteQuery(
    ['entriesInfinite', sort, tag],
    async ({ pageParam }: { pageParam?: any }): Promise<any> => {
      return await getPostsRanked(sort || 'trending', tag, pageParam?.author, pageParam?.permlink);
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
    data: communityData,
    isLoading: communityDataIsLoading,
    isFetching: communityDataIsFetching,
    error: communityDataError
  } = useQuery(['community', tag, ''], () => getCommunity(tag || '', ''), { enabled: !!tag });

  const {
    data: accountEntriesData,
    isLoading: accountEntriesIsLoading,
    isFetching: accountEntriesIsFetching,
    error: accountEntriesError,
    isError: accountEntriesIsError,
    isFetchingNextPage: accountIsFetchingNextPage,
    fetchNextPage: accountFetchNextPage,
    hasNextPage: accountHasNextPage
  } = useInfiniteQuery(
    ['accountEntriesInfinite', username],
    async ({ pageParam }: { pageParam?: any }): Promise<any> => {
      return await getAccountPosts('blog', username, '', pageParam?.author, pageParam?.permlink);
    },
    {
      getNextPageParam: (lastPage: Entry[]) => {
        return {
          author: lastPage && lastPage.length > 0 ? lastPage[lastPage?.length - 1].author : '',
          permlink: lastPage && lastPage.length > 0 ? lastPage[lastPage?.length - 1].permlink : ''
        };
      },
      enabled: Boolean(username)
    }
  );

  const {
    data: historyFeedData,
    isLoading: historyFeedLoading,
    isFetching: historyFeedIsFetching,
    isError: historyFeedError
  } = useQuery(['feedHistory'], () => getFeedHistory());

  const handleChangeFilter = useCallback(
    (e: any) => {
      if (tag) {
        router.push(`/${e}/${tag}`, undefined, { shallow: true });
      } else {
        router.push(`/${e}`, undefined, { shallow: true });
      }
    },
    [router, tag]
  );

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

  useEffect(() => {
    if (inViewAcc && accountEntriesData?.pages[accountEntriesData.pages.length - 1].length) {
      accountFetchNextPage();
    }
  }, [accountFetchNextPage, inViewAcc]);

  if (accountEntriesIsError || entriesDataIsError || historyFeedError) return <CustomError />;

  if (
    (entriesDataIsLoading && entriesDataIsFetching) ||
    (accountEntriesIsLoading && accountEntriesIsFetching) ||
    (historyFeedLoading && historyFeedIsFetching)
  ) {
    return (
      <Loading
        loading={
          entriesDataIsLoading || entriesDataIsFetching || accountEntriesIsLoading || accountEntriesIsFetching
        }
      />
    );
  }

  if (!entriesDataIsLoading && entriesData) {
    return (
      <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2 pt-8">
        <div className="grid grid-cols-12 md:gap-4 ">
          <div className="hidden md:col-span-2 md:flex">
            <CommunitiesSidebar />
          </div>
          <div className="col-span-12 md:col-span-10 lg:col-span-8">
            <div className="hidden md:col-span-10 md:flex lg:hidden">
              {communityData ? <CommunitySimpleDescription data={communityData} /> : <ExploreHive />}
            </div>
            <div className="col-span-12 mb-5 flex flex-col space-y-5 md:col-span-10 lg:col-span-8">
              <div className="mt-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-md font-medium">
                    {tag && communityData ? `${communityData?.title}` : 'All posts'}
                  </span>
                  {tag ? (
                    <span className="text-xs font-light" data-testid="community-name">
                      Community
                    </span>
                  ) : null}
                </div>
                <PostSelectFilter filter={sort} handleChangeFilter={handleChangeFilter} />
              </div>
              <>
                {entriesData.pages.map((page, index) => {
                  return page ? (
                    <PostList data={page} sort={sort} key={`f-${index}`} historyFeedData={historyFeedData} />
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
                    ) : hasNextPage ? (
                      'Load Newer'
                    ) : (
                      'Nothing more to load'
                    )}
                  </button>
                </div>
                <div>{entriesDataIsFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
              </>
            </div>
          </div>
          <div className="hidden lg:col-span-2 lg:flex">
            {communityData ? <CommunityDescription data={communityData} /> : <ExploreHive />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProfileLayout>
      {!accountEntriesIsLoading && accountEntriesData ? (
        <>
          {accountEntriesData.pages.map((page, index) => {
            return page ? (
              <PostList data={page} key={`x-${index}`} historyFeedData={historyFeedData} />
            ) : null;
          })}
          <div>
            <button
              ref={refAcc}
              onClick={() => accountFetchNextPage()}
              disabled={!accountHasNextPage || accountIsFetchingNextPage}
            >
              {accountIsFetchingNextPage ? (
                <PostSkeleton />
              ) : accountEntriesData.pages.length > 1 &&
                accountEntriesData?.pages[accountEntriesData.pages.length - 1].length > 0 ? (
                'Load Newer'
              ) : null}
            </button>
          </div>
          <div>
            {accountEntriesIsFetching && !accountIsFetchingNextPage ? 'Background Updating...' : null}
          </div>
        </>
      ) : null}
    </ProfileLayout>
  );
};

export default ParamPage;
