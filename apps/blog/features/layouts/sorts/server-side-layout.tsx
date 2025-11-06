import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getCommunities } from '@transaction/lib/bridge-api';
import { ReactNode } from 'react';

const sort = 'rank';
const query = null;

const ServerSideLayout = async ({ children }: { children: ReactNode }) => {
  const queryClient = getQueryClient();
  const observer = getObserverFromCookies();
  await queryClient.prefetchQuery({
    queryKey: ['communitiesList', sort],
    queryFn: () => getCommunities(sort, query, observer)
  });

  return <Hydrate state={dehydrate(queryClient)}>{children}</Hydrate>;
};

export default ServerSideLayout;
