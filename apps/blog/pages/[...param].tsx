import { useSiteParams } from '@/blog/components/hooks/use-site-params';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  Entry,
  getAccountNotifications,
  getAccountPosts,
  getCommunity,
  getPostsRanked,
  getSubscribers
} from '@/blog/lib/bridge';
import Loading from '@hive/ui/components/loading';
import { FC, useCallback, useEffect } from 'react';
import PostList from '@/blog/components/post-list';
import { Skeleton } from '@hive/ui/components/skeleton';
import CommunitiesSidebar from '@/blog/components/communities-sidebar';
import PostSelectFilter from '@/blog/components/post-select-filter';
import { useRouter } from 'next/router';
import ExploreHive from '@/blog/components/explore-hive';
import ProfileLayout from '@/blog/components/common/profile-layout';
import CommunityDescription from '@/blog/components/community-description';
import { useInView } from 'react-intersection-observer';
import CustomError from '@/blog/components/custom-error';
import { getFeedHistory } from '@hive/ui/lib/hive';
import CommunitySimpleDescription from '@/blog/components/community-simple-description';
import { convertStringToBig } from '@hive/ui/lib/helpers';
import { CommunitiesSelect } from '@/blog/components/communities-select';

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
    async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
      return await getPostsRanked(sort || 'trending', tag, pageParam?.author, pageParam?.permlink);
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
      enabled: Boolean(sort)
    }
  );
  const {
    isFetching: accountNotificationIsFetching,
    isLoading: accountNotificationIsLoading,
    error: AccountNotificationError,
    data: dataAccountNotification
  } = useQuery(['accountNotification', tag], () => getAccountNotifications(tag ? tag : ''), {
    enabled: !!tag
  });
  const {
    data: communityData,
    isLoading: communityDataIsLoading,
    isFetching: communityDataIsFetching,
    error: communityDataError
  } = useQuery(['community', tag, ''], () => getCommunity(tag || '', ''), { enabled: !!tag });
  const {
    data: subsData,
    isLoading: subsIsLoading,
    isError: subsIsError
  } = useQuery([['subscribers', tag]], () => getSubscribers(tag || ''), { enabled: !!tag });
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
    async ({ pageParam }: { pageParam?: Entry }) => {
      return await getAccountPosts('blog', username, '', pageParam?.author, pageParam?.permlink);
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
      enabled: Boolean(username)
    }
  );
  const lastEntriesData = accountEntriesData?.pages[accountEntriesData?.pages.length - 1];
  const {
    data: historyFeedData,
    isLoading: historyFeedLoading,
    isFetching: historyFeedIsFetching,
    isError: historyFeedError
  } = useQuery(['feedHistory'], () => getFeedHistory());

  const handleChangeFilter = useCallback(
    (e: string) => {
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
    if (inViewAcc && lastEntriesData && lastEntriesData.length) {
      accountFetchNextPage();
    }
  }, [accountFetchNextPage, inViewAcc]);

  if (accountEntriesIsError || entriesDataIsError || historyFeedError) return <CustomError />;

  if (
    (entriesDataIsLoading && entriesDataIsFetching) ||
    (accountEntriesIsLoading && accountEntriesIsFetching) ||
    (historyFeedLoading && historyFeedIsFetching) ||
    !historyFeedData ||
    (accountNotificationIsLoading && accountNotificationIsFetching)
  ) {
    return (
      <Loading
        loading={
          entriesDataIsLoading ||
          entriesDataIsFetching ||
          accountEntriesIsLoading ||
          accountEntriesIsFetching ||
          accountNotificationIsLoading ||
          accountNotificationIsFetching
        }
      />
    );
  }

  const historyFeedArr = historyFeedData?.price_history;
  const price_per_hive = convertStringToBig(historyFeedArr[historyFeedArr.length - 1].base);
  const lastPageData = accountEntriesData?.pages[accountEntriesData?.pages.length - 1];

  if (!entriesDataIsLoading && entriesData) {
    return (
      <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2 pt-8">
        <div className="grid grid-cols-12 md:gap-4">
          <div className="hidden md:col-span-3 md:flex xl:col-span-2">
            <CommunitiesSidebar />
          </div>
          <div className="col-span-12 md:col-span-9 xl:col-span-8">
            <div data-testid="card-explore-hive-mobile" className=" md:col-span-10 md:flex xl:hidden">
              {communityData && subsData ? (
                <CommunitySimpleDescription
                  data={communityData}
                  subs={subsData}
                  username={tag ? tag : ' '}
                  notificationData={dataAccountNotification}
                />
              ) : null}
            </div>
            <div className="col-span-12 mb-5 flex flex-col space-y-5 md:col-span-10 lg:col-span-8">
              <div className="mt-4 flex w-full items-center justify-between">
                <div className="mr-2 flex w-[320px] flex-col">
                  <span className="text-md hidden font-medium md:block" data-testid="community-name">
                    {tag ? (communityData ? `${communityData?.title}` : `#${tag}`) : 'All posts'}
                  </span>
                  {tag ? (
                    <span
                      className="hidden text-xs font-light md:block"
                      data-testid="community-name-unmoderated"
                    >
                      {tag ? (communityData ? 'Community' : 'Unmoderated tag') : ''}
                    </span>
                  ) : null}
                  <span className="md:hidden" translate="no">
                    <CommunitiesSelect
                      username={tag ? (communityData ? `${communityData?.title}` : `#${tag}`) : 'All posts'}
                    />
                  </span>
                </div>
                <div translate="no" className="w-[180px]">
                  <PostSelectFilter filter={sort} handleChangeFilter={handleChangeFilter} />
                </div>
              </div>
              <>
                {entriesData.pages.map((page, index) => {
                  return page ? (
                    <PostList
                      data={page}
                      sort={sort}
                      key={`f-${index}`}
                      price_per_hive={price_per_hive}
                      isCommunityPage={!!communityData}
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
          <div data-testid="card-explore-hive-desktop" className="hidden lg:flex xl:col-span-2">
            {communityData && subsData ? (
              <CommunityDescription
                data={communityData}
                subs={subsData}
                notificationData={dataAccountNotification}
                username="tag"
              />
            ) : (
              <ExploreHive />
            )}
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
            return page ? <PostList data={page} key={`x-${index}`} price_per_hive={price_per_hive} /> : null;
          })}
          <div>
            <button
              ref={refAcc}
              onClick={() => accountFetchNextPage()}
              disabled={!accountHasNextPage || accountIsFetchingNextPage}
            >
              {accountIsFetchingNextPage ? (
                <PostSkeleton />
              ) : accountEntriesData.pages.length > 1 && lastPageData && lastPageData.length > 0 ? (
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
