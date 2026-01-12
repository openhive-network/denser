import { dehydrate, Hydrate } from '@tanstack/react-query';
import CommunityContent from './content';
import { getQueryClient } from '@/blog/lib/react-query';
import { getHivebuzzBadges, getPeakdBadges } from '@transaction/lib/custom-api';
import { getSubscriptions } from '@transaction/lib/bridge-api';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const CommunitiesPage = async ({ params }: { params: { param: string } }) => {
  const queryClient = getQueryClient();
  const username = params.param.replace('%40', '');

  try {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['listAllSubscription', username],
        queryFn: () => getSubscriptions(username)
      }),
      queryClient.prefetchQuery({
        queryKey: ['hivebuzz', username],
        queryFn: () => getHivebuzzBadges(username)
      }),
      queryClient.prefetchQuery({
        queryKey: ['peakd', username],
        queryFn: () => getPeakdBadges(username)
      })
    ]);
  } catch (error) {
    logger.error(error, 'Error in CommunitiesPage:');
  }
  return (
    <Hydrate state={dehydrate(queryClient)}>
      <CommunityContent username={username} />
    </Hydrate>
  );
};

export default CommunitiesPage;
