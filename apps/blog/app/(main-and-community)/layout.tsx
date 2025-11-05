import ClientSideLayout from '@/blog/features/layouts/sorts/client-side-layout';
import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getCommunities } from '@transaction/lib/bridge-api';
import { ReactNode } from 'react';

const sort = 'rank';
const query = null;

const Layout = async ({ children }: { children: ReactNode }) => {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: ['communitiesList', sort],
    queryFn: () => getCommunities(sort, query)
  });

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <ClientSideLayout>{children}</ClientSideLayout>
    </Hydrate>
  );
};
export default Layout;
