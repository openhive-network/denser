import { ReactNode } from 'react';
import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getCommunities, getCommunity } from '@transaction/lib/bridge-api';
import CommunityLayout from './community-layout';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';
import { getLogger } from '@ui/lib/logging';
import { isCommunity } from '@ui/lib/utils';

const sort = 'rank';
const query = null;

const logger = getLogger('app');

const PrefetchComponent = async ({ children, community }: { children: ReactNode; community: string }) => {
  const queryClient = getQueryClient();
  try {
    // Prefetch with DEFAULT_OBSERVER for SEO - client will refetch with user's observer if logged in
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['communitiesList', sort, query, DEFAULT_OBSERVER],
        queryFn: () => getCommunities(sort, query, DEFAULT_OBSERVER)
      }),
      // Only prefetch community data for actual communities (not tags)
      ...(isCommunity(community)
        ? [
            queryClient.prefetchQuery({
              queryKey: ['community', community],
              queryFn: () => getCommunity(community, DEFAULT_OBSERVER)
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
