import { Suspense } from 'react';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getQueryClient } from '@/blog/lib/react-query';
import { SortTypes } from '@/blog/lib/utils';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getPostsRanked } from '@transaction/lib/bridge-api';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { ReactNode } from 'react';
import Loading from '@ui/components/loading';
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
  try {
    const observer = getObserverFromCookies();
    await queryClient.prefetchInfiniteQuery({
      queryKey: ['entriesInfinite', sort, tag],
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
  return (
    <Hydrate state={dehydrate(queryClient)}>
      <Suspense fallback={<Loading loading={true} />}>{children}</Suspense>
    </Hydrate>
  );
};

export default SortPage;
