import ProfileLayout from '@/blog/features/layouts/user-profile/profile-layout';
import { ReactNode } from 'react';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/blog/lib/react-query';
import { getAccountFull, getAccountReputations, getDynamicGlobalProperties } from '@transaction/lib/hive-api';
import { getTwitterInfo } from '@transaction/lib/custom-api';

const Layout = async ({ children, params }: { children: ReactNode; params: { param: string } }) => {
  const queryClient = getQueryClient();
  const { param } = params;
  const username = param.startsWith('@') ? param.replace('@', '') : param;

  await queryClient.prefetchQuery({
    queryKey: ['profileData', username],
    queryFn: () => getAccountFull(username)
  });
  await queryClient.prefetchQuery({
    queryKey: ['accountReputationData', username],
    queryFn: () => getAccountReputations(username, 1)
  });
  await queryClient.prefetchQuery({
    queryKey: ['twitterData', username],
    queryFn: () => getTwitterInfo(username)
  });
  await queryClient.prefetchQuery({
    queryKey: ['dynamicGlobalData'],
    queryFn: () => getDynamicGlobalProperties()
  });
  return (
    <Hydrate state={dehydrate(queryClient)}>
      <ProfileLayout>{children}</ProfileLayout>
    </Hydrate>
  );
};

export default Layout;
