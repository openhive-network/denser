import { useSiteParams } from '@ui/components/hooks/use-site-params';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAccountNotifications } from '@transaction/lib/bridge';
import {
  DATA_LIMIT as PER_PAGE,
  getAccountPosts,
  getCommunity,
  getSubscribers,
  getSubscriptions,
  getPostsRanked
} from '@transaction/lib/bridge';
import { Entry } from '@transaction/lib/extended-hive.chain';
import Loading from '@hive/ui/components/loading';
import { FC, useCallback, useEffect } from 'react';
import PostList from '@/blog/components/post-list';
import { Skeleton } from '@ui/components/skeleton';
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
import { GetServerSideProps } from 'next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import CommunitiesMybar from '../components/communities-mybar';
import userIllegalContent from '@hive/ui/config/lists/user-illegal-content';
import {
  getAccountMetadata,
  getCommunityMetadata,
  getTranslations,
  MetadataProps
} from '../lib/get-translations';
import Head from 'next/head';
import { sortToTitle, sortTypes } from '../lib/utils';
import { QueryClient, dehydrate } from '@tanstack/react-query';

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

const ParamPage: FC<{ metadata: MetadataProps }> = ({ metadata }) => {
  const router = useRouter();
  const { t } = useTranslation('common_blog');
  const { sort, username, tag } = useSiteParams();
  const { ref, inView } = useInView();
  const { ref: refAcc, inView: inViewAcc } = useInView();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const legalBlockedUser = userIllegalContent.includes(username);
  const paramArr = Array.isArray(router.query.param) ? router.query.param : [router.query.param];
  const routerSort = paramArr[0] || 'trending';
  const routerTag = paramArr[1] || '';

  const effectiveUsername = typeof window !== 'undefined' && user?.username ? user.username : '';

  // Validate sort parameter
  const validSorts = ['trending', 'hot', 'created', 'payout', 'payout_comments', 'muted'];
  const isValidSort = validSorts.includes(routerSort);

  // Single effect to handle sort changes
  useEffect(() => {
    if (routerSort && !username) {  // Only run for non-profile pages
      // Instead of removing queries, just invalidate them
      queryClient.invalidateQueries(['entriesInfinite']);
    }
  }, [routerSort, queryClient, username]);

  useEffect(() => {
    if (routerTag && !username) {  // Only run for non-profile pages
      queryClient.invalidateQueries(['entriesInfinite']);
      // Optionally, prefetch the new data for instant feel
      if (isValidSort) {
        queryClient.prefetchInfiniteQuery(['entriesInfinite', routerSort, routerTag],
          async () => getPostsRanked(routerSort, routerTag, undefined, undefined, effectiveUsername)
        );
      }
    }
  }, [routerTag, routerSort, queryClient, effectiveUsername, username, isValidSort]);

  useEffect(() => {
    // When the community (tag) changes, refetch the posts
    if (routerTag) {
      queryClient.invalidateQueries(['entriesInfinite']);
      refetch();
    }
  }, [routerTag]);

  const isClient = typeof window !== 'undefined';

  const {
    data: entriesData,
    isLoading: entriesDataIsLoading,
    isFetching: entriesDataIsFetching,
    isError: entriesDataIsError,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch
  } = useInfiniteQuery(
    ['entriesInfinite', routerSort, routerTag, effectiveUsername],
    async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
      if (!isValidSort) {
        throw new Error(`Invalid sort parameter: ${routerSort}. Valid sorts are: ${validSorts.join(', ')}`);
      }
      return await getPostsRanked(
        routerSort,
        routerTag,
        pageParam?.author,
        pageParam?.permlink,
        effectiveUsername
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
      enabled: Boolean(routerSort) && !username && isValidSort, // Only enable for valid sorts and non-profile pages
      // Add staleTime to prevent unnecessary refetches
      staleTime: 0,
      // Add cacheTime to keep data in cache longer
      cacheTime: 300000, // 5 minutes
      // Add retry logic
      retry: 2,
      retryDelay: 1000
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
  } = useQuery(['AccountNotification', routerTag], () => getAccountNotifications(routerTag || ''), {
    enabled: !!routerTag
  });
  const { data: communityData } = useQuery(
    ['community', routerTag, ''],
    () => getCommunity(routerTag || '', user.username),
    {
      enabled: !!routerTag
    }
  );
  const { data: subsData } = useQuery(['subscribers', routerTag], () => getSubscribers(routerTag || ''), {
    enabled: !!routerTag
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
      if (!validSorts.includes(e)) {
        console.error(`Invalid sort parameter: ${e}`);
        return;
      }

      // Prefetch the new sort data before changing routes
      queryClient.prefetchInfiniteQuery(['entriesInfinite', e, routerTag],
        async () => getPostsRanked(e, routerTag, undefined, undefined, effectiveUsername)
      );

      if (routerTag) {
        router.push(`/${e}/${routerTag}`, undefined, {
          shallow: true,
          scroll: false // Prevent scroll jump
        });
      } else {
        router.push(`/${e}`, undefined, {
          shallow: true,
          scroll: false // Prevent scroll jump
        });
      }
    },
    [router, routerTag, queryClient, effectiveUsername]
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

  const tabTitle =
    Array.isArray(router.query.param) && router.query.param.length > 1
      ? `${metadata.title} / ${sortToTitle(router.query.param[0] as sortTypes)}`
      : sortToTitle((router.query.param?.[0] ?? 'trending') as sortTypes);

  if (username && router.query.param ? router.query.param.length > 1 : false) {
    return <CustomError />;
  }
  if (entriesData && entriesData.pages) {
    // Debug: log data and user
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('[ParamPage] entriesData:', entriesData, 'accountEntriesData:', accountEntriesData, 'user:', user);
    }

    // Only show loading if main data is strictly undefined (not hydrated)
    if (typeof entriesData === 'undefined' && typeof accountEntriesData === 'undefined') {
      return <div>Loading...</div>;
    }

    console.log('paramArr', paramArr, 'username', username, 'entriesData', entriesData, 'accountEntriesData', accountEntriesData);

    return (
      <>
        <Head>
          <title>{`${tabTitle} - posts Hive`}</title>
          <meta property="og:title" content={metadata.title} />
          <meta property="og:description" content={metadata.description} />
          <meta property="og:image" content={metadata.image} />
        </Head>
        <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2">
          <div className="grid grid-cols-12 md:gap-4">
            <div className="hidden md:col-span-3 md:flex xl:col-span-2">
              {isClient && user?.isLoggedIn ? (
                <CommunitiesMybar data={mySubsData} username={user.username} />
              ) : (
                <CommunitiesSidebar />
              )}
            </div>
            <div className="col-span-12 md:col-span-9 xl:col-span-8">
              <div data-testid="card-explore-hive-mobile" className=" md:col-span-10 md:flex xl:hidden">
                {communityData && subsData ? (
                  <CommunitySimpleDescription
                    data={communityData}
                    subs={subsData}
                    username={routerTag ? routerTag : ' '}
                    notificationData={dataAccountNotification}
                  />
                ) : null}
              </div>
              <div className="col-span-12 mb-5 flex flex-col md:col-span-10 lg:col-span-8">
                <div className="my-4 flex w-full items-center justify-between" translate="no">
                  <div className="mr-2 flex w-[320px] flex-col">
                    <span className="text-md hidden font-medium md:block" data-testid="community-name">
                      {routerTag
                        ? communityData
                          ? `${communityData?.title}`
                          : `#${routerTag}`
                        : t('navigation.communities_nav.all_posts')}
                    </span>
                    {routerTag ? (
                      <span
                        className="hidden text-xs font-light md:block"
                        data-testid="community-name-unmoderated"
                      >
                        {routerTag
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
                          routerTag
                            ? communityData
                              ? `${communityData?.title}`
                              : `#${routerTag}`
                            : t('navigation.communities_nav.all_posts')
                        }
                      />
                    </span>
                  </div>
                  <div className="w-[180px]">
                    <PostSelectFilter filter={routerSort} handleChangeFilter={handleChangeFilter} />
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
                      {isFetchingNextPage && entriesData.pages.length > 0 ? (
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
                  username={routerTag ? routerTag : ' '}
                />
              ) : isClient && user?.isLoggedIn ? (
                <CommunitiesSidebar />
              ) : (
                <ExploreHive />
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{metadata.tabTitle}</title>
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
      </Head>
      {!legalBlockedUser ? (
        <ProfileLayout>
          <>
            {accountEntriesData && accountEntriesData.pages ? (
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
                    {accountIsFetchingNextPage && accountEntriesData.pages.length > 0 ? (
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
        </ProfileLayout>
      ) : (
        <div className="p-10">{t('global.unavailable_for_legal_reasons')}</div>
      )}
    </>
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

  try {
    // Check if the first parameter is a username
    if (firstParam.startsWith('@')) {
      metadata = await getAccountMetadata(firstParam, 'Posts');
    }
    // Check if this is a special route that shouldn't trigger community fetching
    else if (
      firstParam === 'lists' ||
      firstParam.startsWith('lists/') ||
      firstParam === 'blacklisted' ||
      firstParam === 'followed_blacklists' ||
      firstParam === 'followed_muted_lists'
    ) {
      // For special routes, just set a basic title
      metadata = {
        ...metadata,
        tabTitle: `${firstParam} - Hive`,
        description: `${firstParam} on Hive: Communities Without Borders.`
      };
    }
    // Only try to get community metadata if we have valid parameters and it's not a special route
    else if (secondParam && !secondParam.startsWith('@') && secondParam.length > 0) {
      try {
        metadata = await getCommunityMetadata(firstParam, secondParam, 'Posts');
      } catch (error) {
        console.error('Error fetching community metadata:', error);
        // Keep default metadata on error
      }
    }

    // React Query SSR: Prefetch main queries
    const queryClient = new QueryClient();
    let sort = ctx.query.sort || 'trending';
    if (Array.isArray(sort)) sort = sort[0];
    
    // Handle tag parameter - don't use it for user profiles
    let tag = '';
    if (secondParam && !firstParam.startsWith('@') && !secondParam.startsWith('@')) {
      tag = secondParam;
    }

    // Prefetch posts (first page) only if not a user profile page
    if (!firstParam.startsWith('@')) {
      await queryClient.prefetchInfiniteQuery(
        ['entriesInfinite', sort, tag],
        async ({ pageParam }) => {
          return await getPostsRanked(
            sort as string,
            tag,
            pageParam?.author,
            pageParam?.permlink,
            '' // No user context on SSR
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
          }
        }
      );
    }

    // Only prefetch community data if we have a valid tag and it's not a special route
    if (
      tag &&
      !tag.startsWith('@') &&
      tag.length > 0 &&
      !firstParam.startsWith('lists/') &&
      firstParam !== 'lists' &&
      !['blacklisted', 'followed_blacklists', 'followed_muted_lists'].includes(firstParam)
    ) {
      try {
        await queryClient.prefetchQuery(['community', tag, ''], () => getCommunity(tag, ''));
        await queryClient.prefetchQuery(['subscribers', tag], () => getSubscribers(tag));
        await queryClient.prefetchQuery(['AccountNotification', tag], () => getAccountNotifications(tag));
      } catch (error) {
        console.error('Error prefetching community data:', error);
        // Continue without community data
      }
    }

    // Utility to replace undefined with null for Next.js serialization
    function replaceUndefinedWithNull(obj: any): any {
      if (Array.isArray(obj)) {
        return obj.map((v) => (v === undefined ? null : replaceUndefinedWithNull(v)));
      } else if (obj && typeof obj === 'object') {
        return Object.fromEntries(
          Object.entries(obj).map(([k, v]) => [k, v === undefined ? null : replaceUndefinedWithNull(v)])
        );
      }
      return obj;
    }

    return {
      props: {
        metadata,
        ...(await getTranslations(ctx)),
        dehydratedState: replaceUndefinedWithNull(dehydrate(queryClient))
      }
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    // Return default props on error
    return {
      props: {
        metadata,
        ...(await getTranslations(ctx)),
        dehydratedState: null
      }
    };
  }
};
