import { FollowListType, getFollowList } from '@/blog/lib/bridge';
import { useQuery } from '@tanstack/react-query';

export const useFollowListQuery = (username: string, type: FollowListType) => {
  return useQuery([type, username], () => getFollowList(username, type), {
    enabled: Boolean(username)
  });
};
