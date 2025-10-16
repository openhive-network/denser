'use client';

import NoDataError from '@/blog/components/no-data-error';
import PostList from '@/blog/features/list-of-posts/posts-loader';
import { PER_PAGE } from '@/blog/features/search/lib/utils';
import { useTranslation } from '@/blog/i18n/client';
import { DEFAULT_OBSERVER, DEFAULT_PREFERENCES, Preferences } from '@/blog/lib/utils';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getAccountPosts } from '@transaction/lib/bridge-api';
import { Entry } from '@transaction/lib/extended-hive.chain';
import userIllegalContent from '@ui/config/lists/user-illegal-content';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { useLocalStorage } from 'usehooks-ts';
import { QueryTypes } from './lib/utils';

const PostsContent = ({ query }: { query: QueryTypes }) => {
  const params = useParams<{ param: string }>();
  const username = params?.param.replace('%40', '') ?? '';
  const legalBlockedUser = userIllegalContent.includes(username);
  const { ref, inView } = useInView();
  // Create a separate ref for prefetching - triggers earlier than the main ref
  const { ref: prefetchRef, inView: prefetchInView } = useInView({
    // Start prefetching when element is 1500px from entering viewport
    rootMargin: '1500px 0px',
    // Only trigger once per element
    triggerOnce: false
  });
  const { t } = useTranslation('common_blog');
  const { user } = useUser();
  const observer = user.isLoggedIn ? user.username : DEFAULT_OBSERVER;
  const [preferences] = useLocalStorage<Preferences>(
    `user-preferences-${user.username}`,
    DEFAULT_PREFERENCES
  );

  const { data, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage, isError } = useInfiniteQuery({
    queryKey: ['accountEntriesInfinite', username, query],
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
    enabled: Boolean(username)
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

  if (isError) return <NoDataError />;

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
              {t('user_profile.no_blogging_yet', { username: username })}
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
