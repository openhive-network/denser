import CommunitiesContent from './content';
import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getCommunities } from '@transaction/lib/bridge-api';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const sort = 'rank';
const query = undefined;

const CommunitiesPage = async () => {
  const queryClient = getQueryClient();
  try {
    // Prefetch with DEFAULT_OBSERVER for SEO - client will refetch with user's observer if logged in
    await queryClient.prefetchQuery({
      queryKey: ['communitiesList', sort, query, DEFAULT_OBSERVER],
      queryFn: async () => await getCommunities(sort, query, DEFAULT_OBSERVER)
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
