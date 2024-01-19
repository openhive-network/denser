import { useSiteParams } from '@hive/ui/components/hooks/use-site-params';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  DATA_LIMIT as PER_PAGE,
  Entry,
  getAccountNotifications,
  getAccountPosts,
  getCommunity,
  getPostsRanked,
  getSubscribers,
  getSubscriptions
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
import CommunitySimpleDescription from '@/blog/components/community-simple-description';
import { CommunitiesSelect } from '@/blog/components/communities-select';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSideProps } from 'next';
import { i18n } from '@/blog/next-i18next.config';

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
  const { t } = useTranslation('common_blog');
  const { sort, username, tag } = useSiteParams();
  const { ref, inView } = useInView();
  const { ref: refAcc, inView: inViewAcc } = useInView();
  const user = { username: 'gtg' };
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
  const {
    data: mySubsData,
    isLoading: mySubsIsLoading,
    isError: mySubsIsError
  } = useQuery([['subscriptions', user?.username]], () => getSubscriptions(user ? user?.username : ''), {
    enabled: Boolean(user?.username)
  });
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
  } = useQuery(['community', tag, ''], () => getCommunity(tag || '', ''), {
    enabled: !!tag
  });
  const {
    data: subsData,
    isLoading: subsIsLoading,
    isError: subsIsError
  } = useQuery([['subscribers', tag]], () => getSubscribers(tag || ''), {
    enabled: !!tag
  });
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
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, inView]);

  useEffect(() => {
    if (inViewAcc && accountHasNextPage) {
      accountFetchNextPage();
    }
  }, [accountFetchNextPage, accountHasNextPage, inViewAcc]);

  if (accountEntriesIsError || entriesDataIsError) return <CustomError />;

  if (
    (entriesDataIsLoading && entriesDataIsFetching) ||
    (accountEntriesIsLoading && accountEntriesIsFetching) ||
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

  if (!entriesDataIsLoading && entriesData) {
    return (
      <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2">
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
            <div className="col-span-12 mb-5 flex flex-col md:col-span-10 lg:col-span-8">
              <div className="my-4 flex w-full items-center justify-between" translate="no">
                <div className="mr-2 flex w-[320px] flex-col">
                  <span className="text-md hidden font-medium md:block" data-testid="community-name">
                    {tag
                      ? communityData
                        ? `${communityData?.title}`
                        : `#${tag}`
                      : t('navigation.communities_nav.all_posts')}
                  </span>
                  {tag ? (
                    <span
                      className="hidden text-xs font-light md:block"
                      data-testid="community-name-unmoderated"
                    >
                      {tag
                        ? communityData
                          ? t('communities.community')
                          : t('communities.unmoderated_tag')
                        : ''}
                    </span>
                  ) : null}
                  <span className="md:hidden">
                    <CommunitiesSelect
                      mySubsData={mySubsData}
                      username={user?.username ? user.username : undefined}
                      title={
                        tag
                          ? communityData
                            ? `${communityData?.title}`
                            : `#${tag}`
                          : t('navigation.communities_nav.all_posts')
                      }
                    />
                  </span>
                </div>
                <div className="w-[180px]">
                  <PostSelectFilter filter={sort} handleChangeFilter={handleChangeFilter} />
                </div>
              </div>
              <>
                {entriesData.pages.map((page, index) => {
                  return page ? (
                    <PostList data={page} key={`f-${index}`} isCommunityPage={!!communityData} />
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
            {communityData && subsData ? (
              <CommunityDescription
                data={communityData}
                subs={subsData}
                notificationData={dataAccountNotification}
                username={tag ? tag : ' '}
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
          {accountEntriesData.pages[0]?.length !== 0 ? (
            accountEntriesData.pages.map((page, index) => {
              return page ? <PostList data={page} key={`x-${index}`} /> : null;
            })
          ) : (
            <div
              className="mt-12 bg-green-100 px-4 py-6 text-sm dark:bg-slate-700"
              data-testid="user-has-not-started-blogging-yet"
            >
              {t('user_profil.no_blogging_yet', { username: username })}
            </div>
          )}
          <div>
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
