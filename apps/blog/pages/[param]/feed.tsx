import { useSiteParams } from '@ui/components/hooks/use-site-params';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  DATA_LIMIT as PER_PAGE,
  type Entry,
  getAccountPosts,
  getSubscriptions,
  getCommunity
} from '@transaction/lib/bridge';
import Loading from '@hive/ui/components/loading';
import { FC, useEffect } from 'react';
import PostList from '@/blog/components/post-list';
import { Skeleton } from '@ui/components/skeleton';
import { useInView } from 'react-intersection-observer';
import CustomError from '@/blog/components/custom-error';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSideProps } from 'next';
import { i18n } from '@/blog/next-i18next.config';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { CommunitiesSelect } from '@/blog/components/communities-select';
import { useUser } from '@smart-signer/lib/auth/use-user';
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

const FeedPage: FC = () => {
  const { t } = useTranslation('common_blog');
  const { username, tag } = useSiteParams();
  const { ref: refAcc, inView: inViewAcc } = useInView();
  const { user } = useUser();
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
      return await getAccountPosts(
        'feed',
        username,
        user?.username || 'hive.blog',
        pageParam?.author,
        pageParam?.permlink
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
      enabled: Boolean(username)
    }
  );
  const {
    data: mySubsData,
    isLoading: mySubsIsLoading,
    isError: mySubsIsError
  } = useQuery([['subscriptions', user?.username]], () => getSubscriptions(user?.username || ''), {
    enabled: Boolean(user?.username)
  });
  const {
    data: communityData,
    isLoading: communityDataIsLoading,
    isFetching: communityDataIsFetching,
    error: communityDataError
  } = useQuery(['community', tag, ''], () => getCommunity(tag || '', ''), {
    enabled: !!tag
  });
  useEffect(() => {
    if (inViewAcc && accountHasNextPage) {
      accountFetchNextPage();
    }
  }, [accountFetchNextPage, accountHasNextPage, inViewAcc]);

  if (accountEntriesIsError || mySubsIsError || communityDataError) return <CustomError />;

  if (
    (accountEntriesIsLoading && accountEntriesIsFetching) ||
    (communityDataIsLoading && communityDataIsFetching)
  ) {
    return <Loading loading={accountEntriesIsLoading || accountEntriesIsFetching} />;
  }

  return (
    <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2">
      <div className="grid grid-cols-12 md:gap-4">
        <div className="hidden md:col-span-3 md:flex xl:col-span-2">
          {user?.isLoggedIn ? (
            <CommunitiesMybar data={mySubsData} username={user?.username || ''} />
          ) : (
            <CommunitiesSidebar />
          )}
        </div>
        <div className="col-span-12 pt-4 md:col-span-9 xl:col-span-8 xl:pt-0">
          <span className="text-md mt-4 hidden text-xl font-medium xl:block">My friends</span>
          <span className="xl:hidden" translate="no">
            <CommunitiesSelect
              username={user?.username || undefined}
              mySubsData={mySubsData}
              title={
                tag
                  ? communityData
                    ? `${communityData?.title}`
                    : `#${tag}`
                  : t('navigation.communities_nav.all_posts')
              }
            />
          </span>

          <div className="col-span-12 mb-5 flex flex-col py-4 md:col-span-10 lg:col-span-8">
            {!accountEntriesIsLoading && accountEntriesData ? (
              <>
                {accountEntriesData.pages[0]?.length !== 0 && user?.username ? (
                  accountEntriesData.pages.map((page, index) => {
                    return page ? <PostList data={page} key={`x-${index}`} /> : null;
                  })
                ) : (
                  <div
                    className="flex flex-col gap-6 bg-green-100 px-4 py-6 text-sm dark:bg-slate-700"
                    data-testid="user-has-not-started-blogging-yet"
                  >
                    <span>You haven&apos;t followed anyone yet!</span>
                    <span style={{ fontSize: '1.1rem' }}>
                      <Link href="/" className="w-fit text-red-500">
                        Explore Trending
                      </Link>
                    </span>
                    <Link href="/welcome" className="w-fit text-red-500">
                      New users guide
                    </Link>
                  </div>
                )}
                <div>
                  {user?.username ? (
                    <button
                      ref={refAcc}
                      onClick={() => accountFetchNextPage()}
                      disabled={!accountHasNextPage || accountIsFetchingNextPage}
                    >
                      {accountIsFetchingNextPage ? (
                        <PostSkeleton />
                      ) : accountHasNextPage ? (
                        t('user_profil.load_newer')
                      ) : accountEntriesData.pages[0] && accountEntriesData.pages[0].length > 0 ? (
                        t('user_profil.nothing_more_to_load')
                      ) : null}
                    </button>
                  ) : null}
                </div>
                <div>
                  {accountEntriesIsFetching && !accountIsFetchingNextPage ? 'Background Updating...' : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
        <div data-testid="card-explore-hive-desktop" className="hidden xl:col-span-2 xl:flex">
          {user?.isLoggedIn ? <CommunitiesSidebar /> : <ExploreHive />}
        </div>
      </div>
    </div>
  );
};

export default FeedPage;

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
