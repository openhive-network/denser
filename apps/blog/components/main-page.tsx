import { useSiteParams } from '@ui/components/hooks/use-site-params';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DATA_LIMIT as PER_PAGE,
  getCommunity,
  getSubscriptions,
  getPostsRanked
} from '@transaction/lib/bridge';
import { useCallback, useEffect } from 'react';
import PostList from '@/blog/components/post-list';
import PostSelectFilter from '@/blog/components/post-select-filter';
import { useRouter } from 'next/router';
import { useInView } from 'react-intersection-observer';
import { CommunitiesSelect } from '@/blog/components/communities-select';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import Head from 'next/head';
import CommunityLayout from '../feature/community-layout/community-layout';
import { sortToTitle, sortTypes } from '@/blog/lib/utils';
import { MetadataProps } from '@/blog/lib/get-translations';
import NoDataError from '@/blog/components/no-data-error';
import { PageType } from '@/blog/pages/[...param]';
import { Preferences } from '@/blog/lib/utils';
import PostCardSkeleton from '@hive/ui/components/card-skeleton';
import { toast } from '@ui/components/hooks/use-toast';

const validSorts = ['trending', 'hot', 'created', 'payout', 'payout_comments', 'muted'];

const MainPage = ({
  metadata,
  pageType,
  nsfwPreferences
}: {
  metadata: MetadataProps;
  pageType: PageType;
  nsfwPreferences: Preferences['nsfw'];
}) => {
  const { t } = useTranslation('common_blog');
  const router = useRouter();
  const { user } = useUser();
  const queryClient = useQueryClient();
  
  // Get params from router
  let param = router.query.param as string[];
  if (!param) {
    param = [];
  }

  // Handle Next.js internal data fetching routes
  // During client-side navigation, Next.js may inject '_next/data' paths into params
  // This happens when the framework fetches data for page transitions
  // We need to extract the actual route params from these internal paths
  if (param.length > 0 && param[0] === '_next') {
    // For _next/data routes, the pattern is ['_next', 'data', 'buildId', 'actual', 'params']
    // We want to skip _next, data, and buildId (3 items)
    if (param.length > 3) {
      param = param.slice(3);
      // Remove .json extension if present
      if (param.length > 0) {
        param[param.length - 1] = param[param.length - 1].replace(/\.json.*$/, '');
      }
    } else {
      // If we don't have enough params after _next/data, use the path
      const pathParts = router.asPath.split('/').filter(p => p && !p.startsWith('#') && !p.startsWith('?'));
      param = pathParts;
    }
  }
  
  // Additional cleanup - remove any remaining invalid params
  param = param.filter(p => p && p !== '_next' && p !== 'data' && !p.includes('.json'));
  const observer = !!user.username ? user.username : '';
  const [sort, tagParam] = param;
  const tag = (tagParam || '').toLocaleLowerCase();

  const isValidSort = validSorts.includes(sort);
  const { username } = useSiteParams();
  const { ref, inView } = useInView();

  const { data: mySubsData } = useQuery(
    ['subscriptions', user?.username],
    () => getSubscriptions(user.username),
    {
      enabled: Boolean(user?.username)
    }
  );
  const { data: communityData } = useQuery(['community', tag], () => getCommunity(tag || '', user.username), {
    enabled: pageType === 'community'
  });
  const { data, isFetching, isError, isFetchingNextPage, fetchNextPage, hasNextPage, refetch } =
    useInfiniteQuery(
      ['entriesInfinite', sort, tag],
      async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
        if (!isValidSort) {
          throw new Error(`Invalid sort parameter: ${sort}. Valid sorts are: ${validSorts.join(', ')}`);
        }
        return await getPostsRanked(sort, tag, pageParam?.author, pageParam?.permlink, observer);
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
        // Add staleTime to prevent unnecessary refetches
        staleTime: 0,
        // Add cacheTime to keep data in cache longer
        cacheTime: 300000, // 5 minutes
        // Add retry logic
        retry: 2,
        retryDelay: 1000
      }
    );
  const tabTitle =
    Array.isArray(router.query.param) && router.query.param.length > 1
      ? `${metadata.title} / ${sortToTitle(router.query.param[0] as sortTypes)}`
      : sortToTitle((router.query.param?.[0] ?? 'trending') as sortTypes);

  const handleChangeFilter = useCallback(
    (e: string) => {
      if (!validSorts.includes(e)) {
        console.error(`Invalid sort parameter: ${e}`);
        return;
      }

      // Prefetch the new sort data before changing routes
      queryClient.prefetchInfiniteQuery(['entriesInfinite', e, tag], async () =>
        getPostsRanked(e, tag, undefined, undefined, observer)
      );

      if (tag) {
        router.push(`/${e}/${tag}`, undefined, {
          shallow: false,
          scroll: false // Prevent scroll jump
        });
      } else {
        router.push(`/${e}`, undefined, {
          shallow: false,
          scroll: false // Prevent scroll jump
        });
      }
    },
    [router, tag, queryClient, observer]
  );
  // Single effect to handle sort changes
  useEffect(() => {
    // Instead of removing queries, just invalidate them
    queryClient.invalidateQueries(['entriesInfinite']);
  }, [sort, queryClient, username]);

  useEffect(() => {
    queryClient.invalidateQueries(['entriesInfinite']);
    // Optionally, prefetch the new data for instant feel
    if (isValidSort) {
      queryClient.prefetchInfiniteQuery(['entriesInfinite', sort, tag], async () =>
        getPostsRanked(sort, tag, undefined, undefined, observer)
      );
    }
  }, [tag, sort, queryClient, observer, username, isValidSort]);
  useEffect(() => {
    // When the community (tag) changes, refetch the posts
    if (tag) {
      queryClient.invalidateQueries(['entriesInfinite']);
      refetch();
    }
  }, [tag]);

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, inView]);

  useEffect(() => {
    if (isError) 
    toast({
      variant: 'destructive',
      title: 'Error fetching your data',
      description: 'Bad internet connection or troubles with API'
    });
  }, [isError])

  return (
    <>
      <Head>
        <title>{`${tabTitle} - posts Hive`}</title>
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
      </Head>
      <CommunityLayout community={tag} mySubsData={mySubsData} communityData={communityData}>
        <div className="col-span-12 md:col-span-9 xl:col-span-8">
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
              {!data
                ? null
                : data.pages.map((page, index) => {
                    return page ? (
                      <PostList
                        nsfwPreferences={nsfwPreferences}
                        data={page}
                        key={`f-${index}`}
                        isCommunityPage={!!communityData}
                        testFilter={sort}
                      />
                    ) : null;
                  })}
              <div>
                <button
                  ref={ref}
                  onClick={() => fetchNextPage()}
                  disabled={!hasNextPage || isFetchingNextPage}
                >
                  {isFetchingNextPage && !!data && data.pages.length > 0 ? (
                    <PostCardSkeleton />
                  ) : hasNextPage ? (
                    t('user_profile.load_newer')
                  ) : (
                    t('user_profile.nothing_more_to_load')
                  )}
                </button>
              </div>
              <div>{isFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
            </>
          </div>
        </div>
      </CommunityLayout>
    </>
  );
};

export default MainPage;
