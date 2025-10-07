'use client';

import SortedPagesPosts from '@/blog/features/sorts-pages/posts-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getPostsRanked } from '@transaction/lib/bridge-api';

const Content = () => {
  const sort = 'trending';

  const { data, isLoading } = useInfiniteQuery({
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
  console.log('Fetched posts data:', data, isLoading);
  return <SortedPagesPosts sort={sort} />;
};
export default Content;
