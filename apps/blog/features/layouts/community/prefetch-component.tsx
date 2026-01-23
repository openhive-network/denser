import { ReactNode } from 'react';
import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getCommunities, getCommunity } from '@transaction/lib/bridge-api';
import CommunityLayout from './community-layout';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getLogger } from '@ui/lib/logging';
import { isCommunity } from '@ui/lib/utils';

const sort = 'rank';
const query = null;

const logger = getLogger('app');

const PrefetchComponent = async ({ children, community }: { children: ReactNode; community: string }) => {
  const queryClient = getQueryClient();
  // Get observer from cookies - returns user's observer if logged in, DEFAULT_OBSERVER for anonymous
  const observer = getObserverFromCookies();
  try {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['communitiesList', sort, query, observer],
        queryFn: () => getCommunities(sort, query, observer)
      }),
      // Only prefetch community data for actual communities (not tags)
      ...(isCommunity(community)
        ? [
            queryClient.prefetchQuery({
              queryKey: ['community', community],
              queryFn: () => getCommunity(community, observer)
            })
          ]
        : [])
    ]);
  } catch (error) {
    logger.error(error, 'Error in PrefetchComponent:');
  }
  return (
    <Hydrate state={dehydrate(queryClient)}>
      <CommunityLayout community={community}>{children}</CommunityLayout>
    </Hydrate>
  );
};

export default PrefetchComponent;
