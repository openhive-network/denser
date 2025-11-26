import { useInfiniteQuery } from '@tanstack/react-query';
import { SearchSort } from '@ui/hooks/use-search';
import { PER_PAGE } from './lib/utils';
import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { useUser } from '@smart-signer/lib/auth/use-user';
import Loading from '@ui/components/loading';
import { getByText } from '@transaction/lib/hive-api';
import Link from 'next/link';
import { Activity } from 'lucide-react';
import { Preferences } from '@transaction/lib/app-types';
import PostCardSkeleton from '@hive/ui/components/card-skeleton';
import PostList from '../list-of-posts/posts-loader';
import { useTranslation } from '@/blog/i18n/client';
import NoDataError from '@/blog/components/no-data-error';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';

const AccountTopicResult = ({
  author,
  query,
  sort,
  nsfwPreferences
}: {
  query: string;
  sort: SearchSort;
  author?: string;
  nsfwPreferences: Preferences['nsfw'];
}) => {
  const { user } = useUser();
  const { ref, inView } = useInView();
  const observer = user.isLoggedIn ? user.username : DEFAULT_OBSERVER;
  const { ref: prefetchRef, inView: prefetchInView } = useInView({
    // Start prefetching when element is 1500px from entering viewport
    rootMargin: '1500px 0px',
    // Only trigger once per element
    triggerOnce: false
  });

  const { t } = useTranslation('common_blog');
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, isError } = useInfiniteQuery({
    queryKey: ['similarPosts', query, author, sort],
    queryFn: async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
      return await getByText({
        pattern: query,
        author,
        observer,
        start_permlink: pageParam?.permlink ?? '',
        start_author: pageParam?.author ?? '',
        limit: PER_PAGE,
        sort
      });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage && lastPage.length === PER_PAGE) {
        return {
          author: lastPage[lastPage.length - 1].author,
          permlink: lastPage[lastPage.length - 1].permlink
        };
      }
    },

    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    enabled: !!query
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

  const totalPosts = data?.pages?.reduce((acc, page) => acc + (page?.length || 0), 0) || 0;

  if (isError) return <NoDataError />;

  return (
    <div>
      {!query ? null : isLoading ? (
        <Loading loading={isLoading} />
      ) : data ? (
        data.pages.map((page, pageIndex) => {
          return page ? (
            <div key={`ai-${pageIndex}`}>
              <PostList data={page} nsfwPreferences={nsfwPreferences} />
              {/* Add prefetch trigger before the last page, when we have more than one page */}
              {pageIndex === data.pages.length - 1 && totalPosts > 10 && (
                <div ref={prefetchRef} className="h-1 w-full" aria-hidden="true" />
              )}
            </div>
          ) : (
            ''
          );
        })
      ) : (
        <div className="mx-auto flex flex-col items-center py-8">
          <h3 className="py-4 text-lg">No Data Available</h3>
          <p className="mb-4 text-center text-muted-foreground">
            There was a problem fetching the data.
          </p>{' '}
          <Link
            href="/status/settings"
            className="mt-4 inline-flex items-center text-primary hover:underline"
          >
            <Activity className="mr-2 h-4 w-4" />
            Check Node Status
          </Link>
        </div>
      )}
      <div>
        <button
          ref={ref}
          onClick={() => {
            fetchNextPage(), console.log('fetchNextPage');
          }}
          disabled={!hasNextPage || isFetchingNextPage}
        >
          {isFetchingNextPage ? (
            <PostCardSkeleton />
          ) : hasNextPage ? (
            t('user_profile.load_newer')
          ) : !isLoading ? (
            t('user_profile.nothing_more_to_load')
          ) : null}
        </button>
      </div>
    </div>
  );
};

export default AccountTopicResult;
