import { SearchSort } from '@ui/hooks/use-search';
import SearchContent from './content';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/blog/lib/react-query';
import { searchPosts } from '@transaction/lib/hivesense-api';
import { getByText } from '@transaction/lib/hive-api';

interface SearchPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

const SearchPage = ({ searchParams }: SearchPageProps) => {
  const aiParam = searchParams.ai as string | undefined;
  const classicQuery = searchParams.q as string | undefined;
  const userTopicQuery = searchParams.a as string | undefined;
  const topicQuery = searchParams.p as string | undefined;
  const sortQuery = searchParams.s as SearchSort | undefined;
  console.log('SearchPage render with params:', {
    aiParam,
    classicQuery,
    userTopicQuery,
    topicQuery,
    sortQuery
  });
  const queryClient = getQueryClient();

  if (aiParam) {
    queryClient.prefetchQuery({
      queryKey: ['searchPosts', aiParam],
      queryFn: async () => {
        return await searchPosts({
          query: aiParam,
          observer: 'hive.blog',
          result_limit: 1000,
          full_posts: 20
        });
      }
    });
  }
  if (classicQuery && sortQuery) {
    queryClient.prefetchInfiniteQuery({
      queryKey: ['similarPosts', classicQuery, undefined, sortQuery],
      queryFn: async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
        return await getByText({
          pattern: classicQuery,
          observer: 'hive.blog',
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
    });
  }
  if (userTopicQuery && topicQuery && sortQuery) {
    queryClient.prefetchInfiniteQuery({
      queryKey: ['similarPosts', topicQuery, userTopicQuery, sortQuery],
      queryFn: async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
        return await getByText({
          pattern: topicQuery,
          author: userTopicQuery,
          observer: 'hive.blog',
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
    });
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
