import { ReactNode } from 'react';
import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import {
  getAccountNotifications,
  getCommunities,
  getCommunity,
  getSubscribers
} from '@transaction/lib/bridge-api';
import CommunityLayout from './community-layout';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getLogger } from '@ui/lib/logging';

const sort = 'rank';
const query = null;

const logger = getLogger('app');

const PrefetchComponent = async ({ children, community }: { children: ReactNode; community: string }) => {
  const queryClient = getQueryClient();
  try {
    const observer = getObserverFromCookies();
    await queryClient.prefetchQuery({
      queryKey: ['communitiesList', sort],
      queryFn: () => getCommunities(sort, query, observer)
    });
    if (community) {
      await queryClient.prefetchQuery({
        queryKey: ['community', community],
        queryFn: async () => await getCommunity(community, observer)
      });
      await queryClient.prefetchQuery({
        queryKey: ['subscribers', community],
        queryFn: async () => await getSubscribers(community)
      });
      await queryClient.prefetchQuery({
        queryKey: ['AccountNotification', community],
        queryFn: async () => await getAccountNotifications(community)
      });
    }
  } catch (error) {
    logger.error('Error in PrefetchComponent:', error);
  }
  return (
    <Hydrate state={dehydrate(queryClient)}>
      <CommunityLayout community={community}>{children}</CommunityLayout>
    </Hydrate>
  );
};

export default PrefetchComponent;
