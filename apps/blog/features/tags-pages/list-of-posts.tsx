'use client';

import { useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { getPostsRanked } from '@transaction/lib/bridge-api';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';
import { DEFAULT_OBSERVER, DEFAULT_PREFERENCES, Preferences, SortTypes } from '@/blog/lib/utils';
import { StaleTime } from '@/blog/lib/react-query';
import { useTranslation } from '@/blog/i18n/client';
import { Entry } from '@hive/common-hiveio-packages/wax';
import PostList from '../list-of-posts/posts-loader';
import NoDataError from '@/blog/components/no-data-error';
import { isCommunity } from '@ui/lib/utils';
import { PostListSkeleton } from '@hive/ui';
import { useSSRObserver, useInitialPosts } from '@/blog/components/observer-provider';

const SortedPagesPosts = ({ sort, tag = '' }: { sort: SortTypes; tag?: string }) => {
  const ssrObserver = useSSRObserver();
  const initialPosts = useInitialPosts();
  const { user, isHydrated } = useUserClient();
  // Use SSR observer before hydration to match prefetched cache keys,
  // then switch to client observer (which should be the same value for logged-in users)
  const clientObserver = user.isLoggedIn ? user.username : DEFAULT_OBSERVER;
  const observer = isHydrated ? clientObserver : ssrObserver;
  const { t } = useTranslation('common_blog');
  const { ref, inView } = useInView();
  // Create a separate ref for prefetching - triggers earlier than the main ref
  const { ref: prefetchRef, inView: prefetchInView } = useInView({
    // Start prefetching when element is 1500px from entering viewport
    rootMargin: '1500px 0px',
    // Only trigger once per element
    triggerOnce: false
  });

  const [preferences] = useStorageWithTTL<Preferences>(
    user.username ? `user-preferences-${user.username}` : '',
    DEFAULT_PREFERENCES,
    StorageTTL.PERMANENT
  );

  const { data, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage, isError, isLoading } = useInfiniteQuery({
    queryKey: ['entriesInfinite', sort, tag, observer],
    queryFn: async ({ pageParam }) => {
      const { author, permlink } = (pageParam as { author?: string; permlink?: string }) || {};
      const postsData = await getPostsRanked(sort, tag, author ?? '', permlink ?? '', observer);
      return postsData ?? [];
    },
    getNextPageParam: (lastPage: Entry[]) => {
      if (!Array.isArray(lastPage) || lastPage.length === 0) return undefined;
      const last = lastPage[lastPage.length - 1] as { author?: string; permlink?: string };
      if (!last?.author || !last?.permlink) return undefined;
      return { author: last.author, permlink: last.permlink };
    },
    // Don't fetch "my communities" for anonymous users — the API would return
    // hive.blog's subscriptions which are meaningless to the actual user.
    enabled: !(tag === 'my' && !user.isLoggedIn),
    // Server-fetched data passed directly via context, bypassing Hydrate/dehydrate
    // which has compatibility issues with Next.js App Router streaming SSR in RQ v4.
    // initialData is only used when the query has no cached data (first load).
    initialData: initialPosts ? { pages: [initialPosts], pageParams: [undefined] } : undefined,
    initialDataUpdatedAt: initialPosts ? Date.now() : undefined,
    staleTime: StaleTime.MEDIUM
  });

  // Auto-fetch the next page when either the prefetch sentinel (1500px ahead)
  // or the load-more button enters view. Guard on !isFetching so a single cycle
  // can't fire while any fetch is in flight — otherwise empty/short pages keep
  // the sentinel in view and we'd loop until exhausting the feed.
  useEffect(() => {
    if ((prefetchInView || inView) && hasNextPage && !isFetching) {
      fetchNextPage();
    }
  }, [prefetchInView, inView, hasNextPage, isFetching, fetchNextPage]);

  // Calculate total posts to determine when to show prefetch trigger
  const totalPosts = data?.pages?.reduce((acc, page) => acc + (page?.length || 0), 0) || 0;

  // Handle API error - show error state with retry option
  if (isError) {
    return <NoDataError />;
  }

  // Handle initial loading state (also show skeleton when refetching with no data,
  // e.g. during observer transition after hydration)
  if (isLoading || (isFetching && !data?.pages?.[0]?.length)) {
    return <PostListSkeleton count={5} />;
  }

  // Handle empty feed for "my" (friends) page
  // Guard with !isFetching to avoid flash during observer transition
  // (when hydration briefly changes observer before auth state resolves)
  const isEmpty = !data?.pages?.[0]?.length;
  if (isEmpty && tag === 'my' && !isFetching) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg text-primary/70">{t('user_profile.empty_feed_not_following')}</p>
      </div>
    );
  }

  return (
    <>
      {!data
        ? null
        : data.pages.map((page, pageIndex) => {
            return page ? (
              <div key={`page-${pageIndex}`}>
                <PostList
                  nsfwPreferences={preferences.nsfw}
                  data={page}
                  key={`f-${pageIndex}`}
                  isCommunityPage={isCommunity(tag)}
                  testFilter={sort}
                />
                {/* Add prefetch trigger before the last page, when we have more than one page */}
                {pageIndex === data.pages.length - 1 && totalPosts > 10 && (
                  <div ref={prefetchRef} className="h-1 w-full" aria-hidden="true" />
                )}
              </div>
            ) : null;
          })}
      <div>
        <button ref={ref} onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
          {isFetchingNextPage && !!data && data.pages.length > 0 ? (
            <div>Loading...</div>
          ) : hasNextPage ? (
            t('user_profile.load_newer')
          ) : data?.pages?.[0] && data.pages[0].length > 0 ? (
            t('user_profile.nothing_more_to_load')
          ) : null}
        </button>
      </div>
      <div>{isFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
    </>
  );
};
export default SortedPagesPosts;
