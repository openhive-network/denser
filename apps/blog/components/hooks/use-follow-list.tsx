import { getFollowList } from '@transaction/lib/bridge-api';
import { useQuery } from '@tanstack/react-query';
import { IFollowList, FollowListType } from '@hive/common-hiveio-packages/wax';
import { StaleTime } from '@/blog/lib/react-query';

export const useFollowListQuery = (
  username: string,
  type: FollowListType,
  serverData?: IFollowList[] | null
) => {
  return useQuery({
    queryKey: [type, username],
    queryFn: () => getFollowList(username, type),
    initialData: serverData ?? undefined,
    initialDataUpdatedAt: serverData ? Date.now() : undefined,
    staleTime: StaleTime.MEDIUM,
    enabled: Boolean(username)
  });
};
