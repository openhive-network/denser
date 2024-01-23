import { useSiteParams } from '@hive/ui/components/hooks/use-site-params';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { DATA_LIMIT, DATA_LIMIT as PER_PAGE, getPostsRanked, getSubscriptions } from '@/blog/lib/bridge';
import Loading from '@hive/ui/components/loading';
import { FC, useCallback, useEffect } from 'react';
import PostList from '@/blog/components/post-list';
import { Skeleton } from '@hive/ui/components/skeleton';
import PostSelectFilter from '@/blog/components/post-select-filter';
import { useRouter } from 'next/router';
import { useInView } from 'react-intersection-observer';
import { CommunitiesSelect } from '@/blog/components/communities-select';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSideProps } from 'next';
import { i18n } from '@/blog/next-i18next.config';
import { useUser } from '@smart-signer/lib/auth/use-user';
import dynamic from 'next/dynamic';
const CommunitiesSidebar = dynamic(() => import('@/blog/components/communities-sidebar'), { ssr: false });
const CommunitiesMybar = dynamic(() => import('@/blog/components/communities-mybar'), { ssr: false });
const ExploreHive = dynamic(() => import('@/blog/components/explore-hive'), { ssr: false });
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

const MyPage: FC = () => {
  const router = useRouter();
  const { sort } = useSiteParams();
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const { ref, inView } = useInView();
  const {
    data: mySubsData,
    isLoading: mySubsIsLoading,
    isError: mySubsIsError
  } = useQuery([['subscriptions', user?.username]], () => getSubscriptions(user ? user?.username : ''), {
    enabled: Boolean(user?.username)
  });

  const handleChangeFilter = useCallback(
    (e: string) => {
      router.push(`/${e}/my`, undefined, { shallow: true });
    },
    [router]
  );
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
    ['entriesInfinite', sort, 'my'],
    async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
      return await getPostsRanked(
        sort || 'trending',
        'my',
        pageParam?.author,
        pageParam?.permlink,
        DATA_LIMIT,
        user?.username || ''
      );
    },
    {
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.length === PER_PAGE) {
          return {
            author: lastPage[lastPage.length - 1].author,
            permlink: lastPage[lastPage.length - 1].permlink
          };
        }
      },
      enabled: Boolean(sort)
    }
  );
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, inView]);

  if (entriesDataIsLoading && entriesDataIsFetching) {
    return <Loading loading={entriesDataIsLoading || entriesDataIsFetching} />;
  }
  return (
    <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2">
      <div className="grid grid-cols-12 md:gap-4">
        <div className="hidden md:col-span-3 md:flex xl:col-span-2">
          {user?.isLoggedIn ? (
            <CommunitiesMybar data={mySubsData} username={user?.username || ''} />
          ) : (
            <CommunitiesSidebar />
          )}{' '}
        </div>
        <div className="col-span-12 md:col-span-9 xl:col-span-8">
          <div className="col-span-12 mb-5 flex flex-col md:col-span-10 lg:col-span-8">
            <div className="my-4 flex w-full items-center justify-between" translate="no">
              <div className="mr-2 flex w-[320px] flex-col">
                <span className="text-md hidden font-medium md:block">My communities</span>
                <span className="md:hidden">
                  <CommunitiesSelect
                    mySubsData={mySubsData}
                    username={user?.username || undefined}
                    title="My Communities"
                  />
                </span>
              </div>
              <div className="w-[180px]">
                <PostSelectFilter filter={sort} handleChangeFilter={handleChangeFilter} />
              </div>
            </div>
            <>
              {entriesData ? (
                entriesData.pages.map((page, index) => {
                  return page ? <PostList data={page} key={`f-${index}`} /> : null;
                })
              ) : (
                <div key="empty" className="mt-12 bg-green-100 px-4 py-6 text-sm dark:bg-slate-700">
                  No posts in sort: {sort}
                </div>
              )}
              <div>
                <button
                  ref={ref}
                  onClick={() => fetchNextPage()}
                  disabled={!hasNextPage || isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <PostSkeleton />
                  ) : hasNextPage ? (
                    t('user_profil.load_newer')
                  ) : (
                    t('user_profil.nothing_more_to_load')
                  )}
                </button>
              </div>
              <div>{entriesDataIsFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
            </>
          </div>
        </div>
        <div data-testid="card-explore-hive-desktop" className="hidden xl:col-span-2 xl:flex">
          {user?.isLoggedIn ? <CommunitiesSidebar /> : <ExploreHive />}
        </div>
      </div>
    </div>
  );
};

export default MyPage;
export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return {
    props: {
      ...(await serverSideTranslations(req.cookies.NEXT_LOCALE! || i18n.defaultLocale, [
        'common_blog',
        'smart-signer'
      ]))
    }
  };
};
