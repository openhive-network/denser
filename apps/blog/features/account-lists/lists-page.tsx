import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getFollowList } from '@transaction/lib/bridge-api';
import { FollowListType } from '@transaction/lib/extended-hive.chain';
import { ReactNode } from 'react';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

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
  try {
    await queryClient.prefetchQuery({
      queryKey: [type, usernameClean],
      queryFn: () => getFollowList(usernameClean, type)
    });
  } catch (error) {
    logger.error('Error in ListsPage:', error);
  }
  return <Hydrate state={dehydrate(queryClient)}>{children}</Hydrate>;
};
export default ListsPage;
