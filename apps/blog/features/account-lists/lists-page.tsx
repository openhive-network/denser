import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getFollowList } from '@transaction/lib/bridge-api';
import { FollowListType } from '@transaction/lib/extended-hive.chain';
import { ReactNode } from 'react';

const ListsPage = async ({
  username,
  children,
  type
}: {
  username: string;
  children: ReactNode;
  type: FollowListType;
}) => {
  const queryClient = getQueryClient();
  const usernameClean = username.replace('%40', '');

  await queryClient.prefetchQuery({
    queryKey: [type, usernameClean],
    queryFn: () => getFollowList(usernameClean, type)
  });
  return <Hydrate state={dehydrate(queryClient)}>{children}</Hydrate>;
};
export default ListsPage;
