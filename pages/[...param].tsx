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

const PostSkeleton = () => {
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

  const {
    data: entriesData,
    isLoading: entriesDataIsLoading,
    isFetching: entriesDataIsFetching,
    error: entriesDataError,
    isError: entriesDataIsError,
    status,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch
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
    isError: accountEntriesIsError,
    error: accountEntriesError
  } = useQuery(
    ['accountEntries', username],
    async () => {
      return await getAccountPosts('blog', username, '').then((res) => {
        return res;
      });
    },
    { enabled: Boolean(username) }
  );

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

  if (accountEntriesIsError || entriesDataIsError) return <CustomError />;

  if (
    (entriesDataIsLoading && entriesDataIsFetching) ||
    (accountEntriesIsLoading && accountEntriesIsFetching)
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
        <div className="grid grid-cols-12 lg:gap-4 ">
          <div className="col-span-12 md:col-span-12 lg:col-span-2">
            <CommunitiesSidebar />
          </div>
          <div className="col-span-12 mb-5 space-y-5 md:col-span-12 lg:col-span-8">
            <div className="mt-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-md font-medium">{tag ? 'Community' : 'All posts'}</span>
                {tag && communityData ? (
                  <span className="text-xs font-light" data-testid="community-name">
                    {communityData?.title}
                  </span>
                ) : null}
              </div>
              <PostSelectFilter filter={sort} handleChangeFilter={handleChangeFilter} />
            </div>
            <>
              {entriesData.pages.map((page, index) => {
                return page ? <PostList data={page} sort={sort} key={`f-${index}`} /> : null;
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
          <div className="col-span-12 md:col-span-12 lg:col-span-2">
            {communityData ? <CommunityDescription data={communityData} /> : <ExploreHive />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProfileLayout>
      <PostList data={accountEntriesData} sort={sort || 'trending'} />
    </ProfileLayout>
  );
};

export default ParamPage;
