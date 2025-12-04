import { getQueryClient } from '@/blog/lib/react-query';
import { getAccountPosts } from '@transaction/lib/bridge-api';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { QueryTypes } from './lib/utils';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const PostsPage = async ({
  children,
  param,
  query
}: {
  children: ReactNode;
  param: string;
  query: QueryTypes;
}) => {
  const queryClient = getQueryClient();
  const username = param.replace('%40', '');
  try {
    const observer = getObserverFromCookies();
    await queryClient.prefetchInfiniteQuery({
      queryKey: ['accountEntriesInfinite', username, query],
      queryFn: async ({ pageParam }) => {
        const { author, permlink } = (pageParam as { author?: string; permlink?: string }) || {};
        const postsData = await getAccountPosts(query, username, observer, author ?? '', permlink ?? '');
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
    logger.error('Error in PostsPage:', error);
  }
  return <Hydrate state={dehydrate(queryClient)}>{children}</Hydrate>;
};
export default PostsPage;
