'use client';

import { useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { getPostsRanked } from '@transaction/lib/bridge-api';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useLocalStorage } from 'usehooks-ts';
import { DEFAULT_OBSERVER, DEFAULT_PREFERENCES, Preferences, SortTypes } from '@/blog/lib/utils';
import { useTranslation } from '@/blog/i18n/client';
import { Entry } from '@transaction/lib/extended-hive.chain';
import PostList from '../list-of-posts/posts-loader';
import NoDataError from '@/blog/components/no-data-error';

const SortedPagesPosts = ({ sort, tag = '' }: { sort: SortTypes; tag?: string }) => {
  const { user } = useUser();
  const observer = user.isLoggedIn ? user.username : DEFAULT_OBSERVER;
  const { t } = useTranslation('common_blog');
  const { ref, inView } = useInView();
  // Create a separate ref for prefetching - triggers earlier than the main ref
  const { ref: prefetchRef, inView: prefetchInView } = useInView({
    // Start prefetching when element is 1500px from entering viewport
    rootMargin: '1500px 0px',
    // Only trigger once per element
    triggerOnce: false
  });

  const [preferences] = useLocalStorage<Preferences>(
    `user-preferences-${user.username}`,
    DEFAULT_PREFERENCES
  );

  const { data, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage, isError } = useInfiniteQuery({
    queryKey: ['entriesInfinite', sort, tag],
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
    }
  });

  // Prefetch when user is getting close to the end
  useEffect(() => {
    if (prefetchInView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [prefetchInView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Fallback: still trigger when reaching the actual button
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Calculate total posts to determine when to show prefetch trigger
  const totalPosts = data?.pages?.reduce((acc, page) => acc + (page?.length || 0), 0) || 0;


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
                  isCommunityPage={tag?.startsWith('hive-')}
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
          ) : (
            t('user_profile.nothing_more_to_load')
          )}
        </button>
      </div>
      <div>{isFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
    </>
  );
};
export default SortedPagesPosts;
