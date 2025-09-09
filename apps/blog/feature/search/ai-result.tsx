import { useInfiniteQuery } from '@tanstack/react-query';
import Loading from '@ui/components/loading';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useTranslation } from 'next-i18next';
import { getSimilarPosts } from '@/blog/lib/get-data';
import { PER_PAGE } from './lib/utils';
import PostList from '@/blog/components/post-list';
import { Preferences } from '@/blog/lib/utils';
import PostCardSkeleton from '@ui/components/card-skeleton';

const AIResult = ({ query, nsfwPreferences }: { query: string; nsfwPreferences: Preferences['nsfw'] }) => {
  const { user } = useUser();
  const { ref, inView } = useInView();
  const { t } = useTranslation('common_blog');

  const { data, isLoading, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery(
    ['similarPosts', query],
    async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
      return await getSimilarPosts({
        pattern: query,
        observer: user.username !== '' ? user.username : 'hive.blog',
        start_permlink: pageParam?.permlink ?? '',
        start_author: pageParam?.author ?? '',
        limit: PER_PAGE
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
          return page ? <PostList data={page} key={`ai-${index}`} nsfwPreferences={nsfwPreferences} /> : null;
        })
      ) : null}
      <div>
        <button ref={ref} onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
          {isFetchingNextPage ? (
            <PostCardSkeleton />
          ) : hasNextPage ? (
            t('user_profile.load_newer')
          ) : !isLoading ? (
            t('user_profile.nothing_more_to_load')
          ) : null}
        </button>
      </div>
      <div>{isFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
    </div>
  );
};
export default AIResult;
