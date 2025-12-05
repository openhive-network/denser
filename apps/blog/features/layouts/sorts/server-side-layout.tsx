import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getCommunities, getSubscriptions } from '@transaction/lib/bridge-api';
import { ReactNode } from 'react';
import { getLogger } from '@ui/lib/logging';

const sort = 'rank';
const query = null;

const logger = getLogger('app');

const ServerSideLayout = async ({ children }: { children: ReactNode }) => {
  const queryClient = getQueryClient();
  try {
    const observer = getObserverFromCookies();
    await queryClient.prefetchQuery({
      queryKey: ['communitiesList', sort],
      queryFn: () => getCommunities(sort, query, observer)
    });
    await queryClient.prefetchQuery({
      queryKey: ['subscriptions', observer],
      queryFn: () => getSubscriptions(observer)
    });
  } catch (error) {
    logger.error('Error in ServerSideLayout:', error);
  }
  return <Hydrate state={dehydrate(queryClient)}>{children}</Hydrate>;
};

export default ServerSideLayout;
