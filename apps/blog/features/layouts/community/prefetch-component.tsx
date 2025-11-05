import { ReactNode } from 'react';
import ClientSideLayout from '@/blog/features/layouts/sorts/client-side-layout';
import { getQueryClient } from '@/blog/lib/react-query';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import {
  getAccountNotifications,
  getCommunities,
  getCommunity,
  getSubscribers
} from '@transaction/lib/bridge-api';
import CommunityLayout from './community-layout';

const sort = 'rank';
const query = null;

const PrefetchComponent = async ({ children, community }: { children: ReactNode; community: string }) => {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: ['communitiesList', sort],
    queryFn: () => getCommunities(sort, query)
  });
  console.log('Layout fetching data for community:', community);
  if (community) {
    await queryClient.prefetchQuery({
      queryKey: ['community', community],
      queryFn: async () => await getCommunity(community, DEFAULT_OBSERVER)
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
  return (
    <Hydrate state={dehydrate(queryClient)}>
      <CommunityLayout community={community}>{children}</CommunityLayout>
    </Hydrate>
  );
};

export default PrefetchComponent;
