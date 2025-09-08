import { useSiteParams } from '@ui/components/hooks/use-site-params';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  DATA_LIMIT,
  DATA_LIMIT as PER_PAGE,
  getPostsRanked,
  getSubscriptions
} from '@transaction/lib/bridge';
import Loading from '@hive/ui/components/loading';
import { FC, useCallback, useEffect } from 'react';
import PostList from '@/blog/components/post-list';
import { Skeleton } from '@ui/components/skeleton';
import PostSelectFilter from '@/blog/components/post-select-filter';
import { useRouter } from 'next/router';
import { useInView } from 'react-intersection-observer';
import { CommunitiesSelect } from '@/blog/components/communities-select';
import { useTranslation } from 'next-i18next';
import { GetServerSideProps } from 'next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import Link from 'next/link';
import { getDefaultProps } from '../../lib/get-translations';
import Head from 'next/head';
import CommunityLayout from '@/blog/feature/community-layout/community-layout';
import { useLocalStorage } from 'usehooks-ts';
import { DEFAULT_PREFERENCES, Preferences } from '@/blog/lib/utils';
import PostCardSkeleton from '@ui/components/card-skeleton';

export const getServerSideProps: GetServerSideProps = getDefaultProps;

const MyPage: FC = () => {
  const router = useRouter();
  const tabTitle = `My Communities / ${router.query.param} - Hive`;
  const { sort } = useSiteParams();
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const { ref, inView } = useInView();
  const [preferences] = useLocalStorage<Preferences>(
    `user-preferences-${user.username}`,
    DEFAULT_PREFERENCES
  );
  const { data: mySubsData } = useQuery(
    ['subscriptions', user?.username],
    () => getSubscriptions(user ? user?.username : ''),
    {
      enabled: Boolean(user?.username)
    }
  );

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
        user?.username,
        DATA_LIMIT
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
    <>
      <Head>
        <title>{tabTitle}</title>
      </Head>
      <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2">
        <CommunityLayout community="">
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
            {entriesData && entriesData.pages[0]?.length !== 0 ? (
              entriesData.pages.map((page, index) => {
                return page ? (
                  <PostList data={page} key={`f-${index}`} nsfwPreferences={preferences.nsfw} />
                ) : null;
              })
            ) : (
              <div
                key="empty"
                className="border-card-empty-border flex flex-col gap-6 border-2 border-solid bg-card-noContent px-4 py-6 text-sm"
              >
                <span>You haven&apos;t joined any active communities yet!</span>
                <Link className="text-xl text-destructive" href="../communities">
                  Explore Communities
                </Link>
              </div>
            )}
            {entriesData && entriesData.pages[0]?.length !== 0 ? (
              <div>
                <button
                  ref={ref}
                  onClick={() => fetchNextPage()}
                  disabled={!hasNextPage || isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <PostCardSkeleton />
                  ) : hasNextPage ? (
                    t('user_profile.load_newer')
                  ) : (
                    t('user_profile.nothing_more_to_load')
                  )}
                </button>
              </div>
            ) : null}
            <div>{entriesDataIsFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
          </>
        </CommunityLayout>
      </div>
    </>
  );
};

export default MyPage;
