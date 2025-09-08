import { useInfiniteQuery } from '@tanstack/react-query';
import { SearchSort } from '@ui/hooks/useSearch';
import { PER_PAGE } from './lib/utils';
import { useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useInView } from 'react-intersection-observer';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { PostSkeleton } from './loading-skeleton';
import PostList from '@/blog/components/post-list';
import Loading from '@ui/components/loading';
import { getByText } from '@transaction/lib/hive';
import Link from 'next/link';
import { Activity } from 'lucide-react';
import { Preferences } from '@transaction/lib/app-types';

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
  const { t } = useTranslation('common_blog');
  const { data, isLoading, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery(
    ['similarPosts', query, author, sort],
    async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
      return await getByText({
        pattern: query,
        author,
        observer: user.username,
        start_permlink: pageParam?.permlink ?? '',
        start_author: pageParam?.author ?? '',
        limit: PER_PAGE,
        sort
      });
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

      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      enabled: !!query
    }
  );

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, inView]);
  return (
    <div>
      {!query ? null : isLoading ? (
        <Loading loading={isLoading} />
      ) : data ? (
        data.pages.map((page, index) => {
          return page ? <PostList data={page} key={`ai-${index}`} nsfwPreferences={nsfwPreferences} /> : '';
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
            <PostSkeleton />
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
