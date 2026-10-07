import { ReactNode } from 'react';
import CommunityLayout from './community-layout';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getCommunityPageData, type CommunityPageData } from '@/blog/lib/community-cache';
import { getLogger } from '@ui/lib/logging';
import { isCommunity } from '@ui/lib/utils';
import { InitialCommunityProvider } from '@/blog/components/observer-provider';
import { RenderedCommunityDescriptionProvider } from './rendered-description-context';

const logger = getLogger('app');

const PrefetchComponent = async ({ children, community }: { children: ReactNode; community: string }) => {
  // Get observer from cookies - returns user's observer if logged in, DEFAULT_OBSERVER for anonymous
  // communitiesList is already provided by parent ServerSideLayout
  const observer = await getObserverFromCookies();
  let pageData: CommunityPageData = { community: null, renderedDescription: null };
  try {
    // Only fetch community data for actual communities (not tags)
    if (isCommunity(community)) {
      pageData = await getCommunityPageData(community, observer);
    }
  } catch (error) {
    logger.error(error, 'Error in PrefetchComponent:');
  }
  // Pass community data directly via context instead of Hydrate/dehydrate.
  return (
    <InitialCommunityProvider value={pageData.community}>
      <RenderedCommunityDescriptionProvider value={pageData.renderedDescription}>
        <CommunityLayout community={community}>{children}</CommunityLayout>
      </RenderedCommunityDescriptionProvider>
    </InitialCommunityProvider>
  );
};

export default PrefetchComponent;
