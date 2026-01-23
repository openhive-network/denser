import { getQueryClient } from '@/blog/lib/react-query';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getCommunities } from '@transaction/lib/bridge-api';
import { ReactNode } from 'react';
import { getLogger } from '@ui/lib/logging';

const sort = 'rank';
const query = null;

const logger = getLogger('app');

const ServerSideLayout = async ({ children }: { children: ReactNode }) => {
  const queryClient = getQueryClient();
  // Get observer from cookies - returns user's observer if logged in, DEFAULT_OBSERVER for anonymous
  // Subscriptions are user-specific and not SSR-critical, so only prefetch communitiesList
  const observer = getObserverFromCookies();
  try {
    await queryClient.prefetchQuery({
      queryKey: ['communitiesList', sort, query, observer],
      queryFn: () => getCommunities(sort, query, observer)
    });
  } catch (error) {
    logger.error(error, 'Error in ServerSideLayout:');
  }
  return <Hydrate state={dehydrate(queryClient)}>{children}</Hydrate>;
};

export default ServerSideLayout;
