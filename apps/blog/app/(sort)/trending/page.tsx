import { getQueryClient } from '@/blog/lib/react-query';
import Content from './content';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getPostsRanked } from '@transaction/lib/bridge-api';

export default async function TrendingPage() {
  const sort = 'trending';
  const queryClient = getQueryClient();

  await queryClient.prefetchInfiniteQuery({
    queryKey: ['entriesInfinite', sort],
    queryFn: async ({ pageParam }) => {
      const { author, permlink } = (pageParam as { author?: string; permlink?: string }) || {};
      const postsData = await getPostsRanked(sort, '', author ?? '', permlink ?? '', '');
      return postsData ?? [];
    },
    getNextPageParam: (lastPage: any[]) => {
      if (!Array.isArray(lastPage) || lastPage.length === 0) return undefined;
      const last = lastPage[lastPage.length - 1] as { author?: string; permlink?: string };
      if (!last?.author || !last?.permlink) return undefined;
      return { author: last.author, permlink: last.permlink };
    }
  });
  return (
    <Hydrate state={dehydrate(queryClient)}>
      <Content />
    </Hydrate>
  );
}
