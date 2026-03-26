import { dehydrate, Hydrate } from '@tanstack/react-query';
import CommunityContent from './content';
import { getQueryClient } from '@/blog/lib/react-query';
import { getHivebuzzBadges, getPeakdBadges, isThirdPartyApiEnabled } from '@transaction/lib/custom-api';
import { getSubscriptions } from '@transaction/lib/bridge-api';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const CommunitiesPage = async ({ params }: { params: { param: string } }) => {
  const username = extractUsernameFromParam(params.param);
  if (!username) notFound();

  const queryClient = getQueryClient();

  try {
    const prefetchPromises = [
      queryClient.prefetchQuery({
        queryKey: ['listAllSubscription', username],
        queryFn: () => getSubscriptions(username)
      })
    ];

    // Only prefetch badge data if third-party APIs are enabled
    if (isThirdPartyApiEnabled()) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ['hivebuzz', username],
          queryFn: () => getHivebuzzBadges(username)
        }),
        queryClient.prefetchQuery({
          queryKey: ['peakd', username],
          queryFn: () => getPeakdBadges(username)
        })
      );
    }

    await Promise.all(prefetchPromises);
  } catch (error) {
    logger.error(error, 'Error in CommunitiesPage:');
  }
  const dehydratedState = dehydrate(queryClient);
  queryClient.clear();
  return (
    <Hydrate state={dehydratedState}>
      <CommunityContent username={username} />
    </Hydrate>
  );
};

export default CommunitiesPage;
