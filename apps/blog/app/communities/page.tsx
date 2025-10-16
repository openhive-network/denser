import CommunitiesContent from './cotent';
import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getCommunities } from '@transaction/lib/bridge-api';

const sort = 'rank';
const query = '';
const username = '';

const CommunitiesPage = async () => {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['communitiesList', sort, query, username],
    queryFn: async () => await getCommunities(sort, query, username)
  });
  return (
    <Hydrate state={dehydrate(queryClient)}>
      <CommunitiesContent />
    </Hydrate>
  );
};

export default CommunitiesPage;
