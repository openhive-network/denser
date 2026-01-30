import { SearchSort } from '@ui/hooks/use-search';
import SearchContent from './content';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/blog/lib/react-query';
import { searchPosts } from '@transaction/lib/hivesense-api';
import { getByText } from '@transaction/lib/hive-api';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getLogger } from '@ui/lib/logging';
import { parseSearchParams } from '@ui/lib/search-params';

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const logger = getLogger('app');

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  const resolvedSearchParams = await searchParams;
  const validatedParams = parseSearchParams(resolvedSearchParams);
  const aiParam = validatedParams.ai;
  const classicQuery = validatedParams.q;
  const userTopicQuery = validatedParams.a;
  const topicQuery = validatedParams.p;
  const sortQuery = validatedParams.s as SearchSort | undefined;

  const queryClient = getQueryClient();
  try {
    const observer = await getObserverFromCookies();
    const prefetchPromises: Promise<void>[] = [];

    if (aiParam) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ['searchPosts', aiParam],
          queryFn: async () => {
            return await searchPosts({
              query: aiParam,
              observer,
              resultLimit: 1000,
              fullPosts: 20
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
          initialPageParam: undefined as { author: string; permlink: string } | undefined,
          getNextPageParam: (lastPage: Awaited<ReturnType<typeof getByText>>) => {
            if (lastPage && lastPage.length === 20) {
              return {
                author: lastPage[lastPage.length - 1].author,
                permlink: lastPage[lastPage.length - 1].permlink
              };
            }
            return undefined;
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
          initialPageParam: undefined as { author: string; permlink: string } | undefined,
          getNextPageParam: (lastPage: Awaited<ReturnType<typeof getByText>>) => {
            if (lastPage && lastPage.length === 20) {
              return {
                author: lastPage[lastPage.length - 1].author,
                permlink: lastPage[lastPage.length - 1].permlink
              };
            }
            return undefined;
          }
        })
      );
    }

    await Promise.all(prefetchPromises);
  } catch (error) {
    logger.error(error, 'Error in SearchPage:');
  }
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SearchContent
        aiParam={aiParam}
        classicQuery={classicQuery}
        userTopicQuery={userTopicQuery}
        topicQuery={topicQuery}
        sortQuery={sortQuery}
      />
    </HydrationBoundary>
  );
};

export default SearchPage;
