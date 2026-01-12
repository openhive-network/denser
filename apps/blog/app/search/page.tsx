import { SearchSort } from '@ui/hooks/use-search';
import SearchContent from './content';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/blog/lib/react-query';
import { searchPosts } from '@transaction/lib/hivesense-api';
import { getByText } from '@transaction/lib/hive-api';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getLogger } from '@ui/lib/logging';
import { parseSearchParams } from '@ui/lib/search-params';

interface SearchPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

const logger = getLogger('app');

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  const validatedParams = parseSearchParams(searchParams);
  const aiParam = validatedParams.ai;
  const classicQuery = validatedParams.q;
  const userTopicQuery = validatedParams.a;
  const topicQuery = validatedParams.p;
  const sortQuery = validatedParams.s as SearchSort | undefined;

  const queryClient = getQueryClient();
  try {
    const observer = getObserverFromCookies();
    const prefetchPromises: Promise<void>[] = [];

    if (aiParam) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ['searchPosts', aiParam],
          queryFn: async () => {
            return await searchPosts({
              query: aiParam,
              observer,
              result_limit: 1000,
              full_posts: 20
            });
          }
        })
      );
    }
    if (classicQuery && sortQuery) {
      prefetchPromises.push(
        queryClient.prefetchInfiniteQuery({
          queryKey: ['similarPosts', classicQuery, undefined, sortQuery],
          queryFn: async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
            return await getByText({
              pattern: classicQuery,
              observer,
              start_permlink: pageParam?.permlink ?? '',
              start_author: pageParam?.author ?? '',
              limit: 20,
              sort: sortQuery
            });
          },
          getNextPageParam: (lastPage) => {
            if (lastPage && lastPage.length === 20) {
              return {
                author: lastPage[lastPage.length - 1].author,
                permlink: lastPage[lastPage.length - 1].permlink
              };
            }
          }
        })
      );
    }
    if (userTopicQuery && topicQuery && sortQuery) {
      prefetchPromises.push(
        queryClient.prefetchInfiniteQuery({
          queryKey: ['similarPosts', topicQuery, userTopicQuery, sortQuery],
          queryFn: async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
            return await getByText({
              pattern: topicQuery,
              author: userTopicQuery,
              observer,
              start_permlink: pageParam?.permlink ?? '',
              start_author: pageParam?.author ?? '',
              limit: 20,
              sort: sortQuery
            });
          },
          getNextPageParam: (lastPage) => {
            if (lastPage && lastPage.length === 20) {
              return {
                author: lastPage[lastPage.length - 1].author,
                permlink: lastPage[lastPage.length - 1].permlink
              };
            }
          }
        })
      );
    }

    await Promise.all(prefetchPromises);
  } catch (error) {
    logger.error(error, 'Error in SearchPage:');
  }
  return (
    <Hydrate state={dehydrate(queryClient)}>
      <SearchContent
        aiParam={aiParam}
        classicQuery={classicQuery}
        userTopicQuery={userTopicQuery}
        topicQuery={topicQuery}
        sortQuery={sortQuery}
      />
    </Hydrate>
  );
};

export default SearchPage;
