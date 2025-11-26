import { getFollowList } from '@transaction/lib/bridge-api';
import { useQuery } from '@tanstack/react-query';
import { FollowListType } from '@transaction/lib/extended-hive.chain';

export const useFollowListQuery = (username: string, type: FollowListType) => {
  return useQuery({
    queryKey: [type, username],
    queryFn: () => getFollowList(username, type),
    enabled: Boolean(username)
  });
};
