import { getQueryClient } from '@/blog/lib/react-query';
import { SortTypes } from '@/blog/lib/utils';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getPostsRanked } from '@transaction/lib/bridge-api';
import { Entry } from '@hive/common-hiveio-packages/wax';
import { ReactNode } from 'react';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const SortPage = async ({
  children,
  sort,
  tag = ''
}: {
  children: ReactNode;
  sort: SortTypes;
  tag?: string;
}) => {
  const queryClient = getQueryClient();
  // Get observer from cookies - returns user's observer if logged in, DEFAULT_OBSERVER for anonymous
  // Community data (getCommunity) is already prefetched in the layout's PrefetchComponent
  const observer = getObserverFromCookies();
  try {
    await queryClient.prefetchInfiniteQuery({
      queryKey: ['entriesInfinite', sort, tag, observer],
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
  } catch (error) {
    logger.error(error, 'Error in SortPage:');
  }
  return <Hydrate state={dehydrate(queryClient)}>{children}</Hydrate>;
};

export default SortPage;
