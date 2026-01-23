import { getQueryClient } from '@/blog/lib/react-query';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getCommunities } from '@transaction/lib/bridge-api';
import { ReactNode } from 'react';
import { getLogger } from '@ui/lib/logging';

const sort = 'rank';
const query = null;

const logger = getLogger('app');

const ServerSideLayout = async ({ children }: { children: ReactNode }) => {
  const queryClient = getQueryClient();
  try {
    // Prefetch with DEFAULT_OBSERVER for SEO - client will refetch with user's observer if logged in
    // Subscriptions are user-specific and not SSR-critical, so only prefetch communitiesList
    await queryClient.prefetchQuery({
      queryKey: ['communitiesList', sort, query, DEFAULT_OBSERVER],
      queryFn: () => getCommunities(sort, query, DEFAULT_OBSERVER)
    });
  } catch (error) {
    logger.error(error, 'Error in ServerSideLayout:');
  }
  return <Hydrate state={dehydrate(queryClient)}>{children}</Hydrate>;
};

export default ServerSideLayout;
