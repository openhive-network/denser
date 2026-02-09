import { getFollowList } from '@transaction/lib/bridge-api';
import { FollowListType } from '@hive/common-hiveio-packages/wax';
import { ReactNode } from 'react';
import { getLogger } from '@ui/lib/logging';
import { InitialFollowListProvider } from '@/blog/components/observer-provider';

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
  const usernameClean = username.replace('%40', '');
  let initialData = null;
  try {
    initialData = (await getFollowList(usernameClean, type)) ?? null;
  } catch (error) {
    logger.error(error, 'Error in ListsPage:');
  }
  return <InitialFollowListProvider value={initialData}>{children}</InitialFollowListProvider>;
};
export default ListsPage;
