'use client';

import NoDataError from '@/blog/components/no-data-error';
import PostList from '@/blog/features/list-of-posts/posts-loader';
import { PER_PAGE } from '@/blog/features/search/lib/utils';
import { useTranslation } from '@/blog/i18n/client';
import { DEFAULT_OBSERVER, DEFAULT_PREFERENCES, Preferences } from '@/blog/lib/utils';
import { StaleTime } from '@/blog/lib/react-query';
import { useSSRObserver, useInitialPosts } from '@/blog/components/observer-provider';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getAccountPosts } from '@transaction/lib/bridge-api';
import { Entry } from '@hive/common-hiveio-packages/wax';
import { PostListSkeleton } from '@hive/ui';
import userIllegalContent from '@ui/config/lists/user-illegal-content';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';
import { QueryTypes } from './lib/utils';

const PostsContent = ({ query }: { query: QueryTypes }) => {
  const params = useParams<{ param: string }>();
  const username = params?.param.replace('%40', '') ?? '';
  const legalBlockedUser = userIllegalContent.includes(username);
  const ssrObserver = useSSRObserver();
  const initialPosts = useInitialPosts();
  const { ref, inView } = useInView();
  // Create a separate ref for prefetching - triggers earlier than the main ref
  const { ref: prefetchRef, inView: prefetchInView } = useInView({
    // Start prefetching when element is 1500px from entering viewport
    rootMargin: '1500px 0px',
    // Only trigger once per element
    triggerOnce: false
  });
  const { t } = useTranslation('common_blog');
  const { user, isHydrated } = useUserClient();
  // Use SSR observer before hydration to match prefetched cache keys,
  // then switch to client observer (which should be the same value for logged-in users)
  const clientObserver = user.isLoggedIn ? user.username : DEFAULT_OBSERVER;
  const observer = isHydrated ? clientObserver : ssrObserver;
  const [preferences] = useStorageWithTTL<Preferences>(
    user.username ? `user-preferences-${user.username}` : '',
    DEFAULT_PREFERENCES,
    StorageTTL.PERMANENT
  );

  const { data, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage, isError, isLoading } = useInfiniteQuery({
    queryKey: ['accountEntriesInfinite', username, query, observer],
    queryFn: async ({ pageParam }: { pageParam?: Entry }) => {
      return await getAccountPosts(query, username, observer, pageParam?.author, pageParam?.permlink);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage && lastPage.length === PER_PAGE) {
        return {
          author: lastPage[lastPage.length - 1].author,
          permlink: lastPage[lastPage.length - 1].permlink
        };
      }
    },
    enabled: Boolean(username),
    // Server-fetched data passed directly via context, bypassing Hydrate/dehydrate
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

  const getNoContentMessage = () => {
    if (query === 'posts' || query === 'comments')
      return t('user_profile.no_posts_yet', { username: username });
    if (query === 'payout') return t('user_profile.no_pending_payouts');
    if (query === 'replies') return t('user_profile.no_replies_yet', { username: username });
    if (query === 'feed') return t('user_profile.empty_feed_not_following');
    return t('user_profile.no_blogging_yet', { username: username });
  };

  if (isError) return <NoDataError />;

  if (isLoading || (isFetching && !data?.pages?.[0]?.length)) {
    return <PostListSkeleton count={4} />;
  }

  return !legalBlockedUser ? (
    <>
      {data && data.pages ? (
        <>
          {data.pages[0]?.length !== 0 ? (
            data.pages.map((page, pageIndex) => {
              return page ? (
                <div key={`page-${pageIndex}`}>
                  <PostList
                    data={page}
                    key={`x-${pageIndex}`}
                    nsfwPreferences={preferences.nsfw}
                    testFilter="profile-blog-list"
                  />
                  {/* Add prefetch trigger before the last page, when we have more than one page */}
                  {pageIndex === data.pages.length - 1 && totalPosts > 10 && (
                    <div ref={prefetchRef} className="h-1 w-full" aria-hidden="true" />
                  )}
                </div>
              ) : null;
            })
          ) : (
            <div
              className="border-card-empty-border mt-12 border-2 border-solid bg-card-noContent px-4 py-6 text-sm"
              data-testid="user-has-not-started-blogging-yet"
            >
              {getNoContentMessage()}
            </div>
          )}
          <div>
            <button ref={ref} onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
              {isFetchingNextPage && data.pages.length > 0 ? (
                <div>Loading...</div>
              ) : hasNextPage ? (
                t('user_profile.load_newer')
              ) : data.pages[0] && data.pages[0].length > 0 ? (
                t('user_profile.nothing_more_to_load')
              ) : null}
            </button>
          </div>
          <div>{isFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
        </>
      ) : null}
    </>
  ) : (
    <div className="p-10">{t('global.unavailable_for_legal_reasons')}</div>
  );
};

export default PostsContent;
