import { getFollowList } from '@transaction/lib/bridge';
import { useQuery } from '@tanstack/react-query';
import { FollowListType } from '@transaction/lib/extended-hive.chain';

export const useFollowListQuery = (username: string, type: FollowListType) => {
  return useQuery([type, username], () => getFollowList(username, type), {
    enabled: Boolean(username)
  });
};
