import CommunitiesContent from './content';
import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getCommunities } from '@transaction/lib/bridge-api';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const sort = 'rank';
const query = undefined;

const CommunitiesPage = async () => {
  const queryClient = getQueryClient();
  // Get observer from cookies - returns user's observer if logged in, DEFAULT_OBSERVER for anonymous
  const observer = getObserverFromCookies();
  try {
    await queryClient.prefetchQuery({
      queryKey: ['communitiesList', sort, query, observer],
      queryFn: async () => await getCommunities(sort, query, observer)
    });
  } catch (error) {
    logger.error(error, 'Error in CommunitiesPage:');
  }
  return (
    <Hydrate state={dehydrate(queryClient)}>
      <CommunitiesContent />
    </Hydrate>
  );
};

export default CommunitiesPage;
