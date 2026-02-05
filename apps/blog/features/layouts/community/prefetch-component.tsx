import { ReactNode } from 'react';
import { getCommunity } from '@transaction/lib/bridge-api';
import CommunityLayout from './community-layout';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getLogger } from '@ui/lib/logging';
import { isCommunity } from '@ui/lib/utils';
import { InitialCommunityProvider } from '@/blog/components/observer-provider';

const logger = getLogger('app');

const PrefetchComponent = async ({ children, community }: { children: ReactNode; community: string }) => {
  // Get observer from cookies - returns user's observer if logged in, DEFAULT_OBSERVER for anonymous
  // communitiesList is already provided by parent ServerSideLayout
  const observer = await getObserverFromCookies();
  let communityData = null;
  try {
    // Only fetch community data for actual communities (not tags)
    if (isCommunity(community)) {
      communityData = (await getCommunity(community, observer)) ?? null;
    }
  } catch (error) {
    logger.error(error, 'Error in PrefetchComponent:');
  }
  // Pass community data directly via context instead of Hydrate/dehydrate.
  return (
    <InitialCommunityProvider value={communityData}>
      <CommunityLayout community={community}>{children}</CommunityLayout>
    </InitialCommunityProvider>
  );
};

export default PrefetchComponent;
