import CommunitiesContent from './content';
import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getCommunities } from '@transaction/lib/bridge-api';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';

const sort = 'rank';
const query = undefined;

const CommunitiesPage = async () => {
  const observer = getObserverFromCookies();
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['communitiesList', sort, query],
    queryFn: async () => await getCommunities(sort, query, observer)
  });

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <CommunitiesContent />
    </Hydrate>
  );
};

export default CommunitiesPage;
