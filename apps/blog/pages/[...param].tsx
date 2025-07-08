import { useSiteParams } from '@ui/components/hooks/use-site-params';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getAccountNotifications } from '@transaction/lib/bridge';
import {
  DATA_LIMIT as PER_PAGE,
  Entry,
  getAccountPosts,
  getCommunity,
  getSubscribers,
  getSubscriptions,
  getPostsRanked
} from '@transaction/lib/bridge';
import Loading from '@hive/ui/components/loading';
import { FC, useCallback, useEffect } from 'react';
import PostList from '@/blog/components/post-list';
import { Skeleton } from '@ui/components/skeleton';
// import CommunitiesSidebar from '@/blog/components/communities-sidebar';
import PostSelectFilter from '@/blog/components/post-select-filter';
import { useRouter } from 'next/router';
// import ExploreHive from '@/blog/components/explore-hive';
import ProfileLayout from '@/blog/components/common/profile-layout';
import CommunityDescription from '@/blog/components/community-description';
import { useInView } from 'react-intersection-observer';
import CustomError from '@/blog/components/custom-error';
import CommunitySimpleDescription from '@/blog/components/community-simple-description';
import { CommunitiesSelect } from '@/blog/components/communities-select';
import { useTranslation } from 'next-i18next';
import { GetServerSideProps } from 'next';
import { useUser } from '@smart-signer/lib/auth/use-user';
// import CommunitiesMybar from '../components/communities-mybar';
import userIllegalContent from '@hive/ui/config/lists/user-illegal-content';
import {
  getAccountMetadata,
  getCommunityMetadata,
  getTranslations,
  MetadataProps
} from '../lib/get-translations';
import Head from 'next/head';
import { sortToTitle, sortTypes } from '../lib/utils';

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

const ParamPage: FC = ({ metadata }: any) => {
  const router = useRouter();
  const { t } = useTranslation('common_blog');
  const { sort, username, tag } = useSiteParams();
  const { ref, inView } = useInView();
  const { ref: refAcc, inView: inViewAcc } = useInView();
  const { user } = useUser();
  const legalBlockedUser = userIllegalContent.includes(username);
  const {
    data: entriesData,
    isLoading: entriesDataIsLoading,
    isFetching: entriesDataIsFetching,
    isError: entriesDataIsError,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage
  } = useInfiniteQuery(
    ['entriesInfinite', sort, tag],
    async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
      return await getPostsRanked(
        sort || 'trending',
        tag,
        pageParam?.author,
        pageParam?.permlink,
        user.username
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
  const { data: mySubsData } = useQuery(
    ['subscriptions', user?.username],
    () => getSubscriptions(user.username),
    {
      enabled: Boolean(user?.username)
    }
  );
  const {
    isFetching: AccountNotificationIsFetching,
    isLoading: AccountNotificationIsLoading,
    data: dataAccountNotification
  } = useQuery(['AccountNotification', tag], () => getAccountNotifications(tag || ''), {
    enabled: !!tag
  });
  const { data: communityData } = useQuery(
    ['community', tag, ''],
    () => getCommunity(tag || '', user.username),
    {
      enabled: !!tag
    }
  );
  const { data: subsData } = useQuery(['subscribers', tag], () => getSubscribers(tag || ''), {
    enabled: !!tag
  });
  const {
    data: accountEntriesData,
    isLoading: accountEntriesIsLoading,
    isFetching: accountEntriesIsFetching,
    isError: accountEntriesIsError,
    isFetchingNextPage: accountIsFetchingNextPage,
    fetchNextPage: accountFetchNextPage,
    hasNextPage: accountHasNextPage
  } = useInfiniteQuery(
    ['accountEntriesInfinite', username],
    async ({ pageParam }: { pageParam?: Entry }) => {
      return await getAccountPosts('blog', username, user.username, pageParam?.author, pageParam?.permlink);
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
  useEffect(() => {
    // Save scroll position when leaving the page
    const handleRouteChange = () => {
      sessionStorage.setItem('scrollPosition', window.scrollY.toString());
    };

    // Restore scroll position when returning to the page
    const restoreScrollPosition = () => {
      const scrollPosition = sessionStorage.getItem('scrollPosition');
      if (scrollPosition) {
        window.scrollTo(0, parseInt(scrollPosition));
        handleRouteChange();
      }
    };
    router.events.on('routeChangeStart', handleRouteChange);
    // Restore scroll position after the page content is loaded
    if (typeof window !== 'undefined') {
      // Wait for content to be rendered
      setTimeout(restoreScrollPosition, 500);
    }

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events]);
  if (accountEntriesIsError || entriesDataIsError) return <CustomError />;

  if (
    (entriesDataIsLoading && entriesDataIsFetching) ||
    (accountEntriesIsLoading && accountEntriesIsFetching) ||
    (AccountNotificationIsLoading && AccountNotificationIsFetching)
  ) {
    return (
      <Loading
        loading={
          entriesDataIsLoading ||
          entriesDataIsFetching ||
          accountEntriesIsLoading ||
          accountEntriesIsFetching ||
          AccountNotificationIsLoading ||
          AccountNotificationIsFetching
        }
      />
    );
  }
  const tabTitle =
    Array.isArray(router.query.param) && router.query.param.length > 1
      ? `${metadata.title} / ${sortToTitle(router.query.param[0] as sortTypes)}`
      : sortToTitle((router.query.param?.[0] ?? 'trending') as sortTypes);

  if (username && router.query.param ? router.query.param.length > 1 : false) {
    return <CustomError />;
  }
  if (!entriesDataIsLoading && entriesData) {
    return (
      <>
        <Head>
          {/* <title>{`${tabTitle} posts - Suseona`}</title> */}
          <title>{`Blog - Suseona`}</title>
          <meta property="og:title" content={metadata.title} />
          <meta property="og:description" content={metadata.description} />
          <meta property="og:image" content={metadata.image} />
        </Head>
        <div className="container mx-auto max-w-screen-2xl flex-grow px-2.5 pb-2 sm:px-4">
          <div className="grid grid-cols-12 md:gap-4">
            <div className="hidden lg:col-span-1 lg:flex 2xl:col-span-2"></div>
            <div className="col-span-12 md:col-span-9 lg:col-span-8 xl:col-span-7 2xl:col-span-6">
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
                        t('user_profile.load_newer')
                      ) : (
                        t('user_profile.nothing_more_to_load')
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
              ) : user?.isLoggedIn ? (
                // <CommunitiesSidebar />
                <></>
              ) : (
                // <ExploreHive />
                <></>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <ProfileLayout>
      <Head>
        <title>{metadata.tabTitle}</title>
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
      </Head>
      {!legalBlockedUser ? (
        <>
          {' '}
          {!accountEntriesIsLoading && accountEntriesData ? (
            <>
              {accountEntriesData.pages[0]?.length !== 0 ? (
                accountEntriesData.pages.map((page, index) => {
                  return page ? <PostList data={page} key={`x-${index}`} /> : null;
                })
              ) : (
                <div
                  className="border-card-empty-border mt-12 border-2 border-solid bg-card-noContent px-4 py-6 text-sm"
                  data-testid="user-has-not-started-blogging-yet"
                >
                  {t('user_profile.no_blogging_yet', { username: username })}
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
                    t('user_profile.load_newer')
                  ) : accountEntriesData.pages[0] && accountEntriesData.pages[0].length > 0 ? (
                    t('user_profile.nothing_more_to_load')
                  ) : null}
                </button>
              </div>
              <div>
                {accountEntriesIsFetching && !accountIsFetchingNextPage ? 'Background Updating...' : null}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <div className="p-10">{t('global.unavailable_for_legal_reasons')}</div>
      )}
    </ProfileLayout>
  );
};

export default ParamPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const firstParam = ctx.params?.param?.[0] ?? '';
  const secondParam = ctx.params?.param?.[1] || '';

  let metadata = {
    tabTitle: '',
    description: '',
    image: 'https://hive.blog/images/hive-blog-share.png',
    title: firstParam
  };

  // Check if the first parameter is a username
  if (firstParam.startsWith('@')) {
    // If it is, fetch the account data
    metadata = await getAccountMetadata(firstParam, 'Posts');
  }
  // Check if second parameter exists
  if (secondParam !== '') {
    // If second parameter exists, that means it's a community
    metadata = await getCommunityMetadata(firstParam, secondParam, 'Posts');
  }

  return {
    props: {
      metadata,
      ...(await getTranslations(ctx))
    }
  };
};
