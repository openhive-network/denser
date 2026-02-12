import { getFollowers } from '@transaction/lib/hive-api';
import { useInfiniteQuery } from '@tanstack/react-query';
import { DEFAULT_PARAMS_FOR_FOLLOW, IGetFollowParams } from '@transaction/lib/hive-api';
import { IFollow } from '@hive/common-hiveio-packages/wax';
import { StaleTime } from '@/blog/lib/react-query';

export const useFollowersInfiniteQuery = (
  account: IGetFollowParams['account'],
  limit: IGetFollowParams['limit'] = DEFAULT_PARAMS_FOR_FOLLOW.limit,
  initialPages?: IFollow[] | null
) => {
  return useInfiniteQuery({
    queryKey: ['followersData', account],
    queryFn: ({ pageParam: last_id }) => getFollowers({ account, start: last_id, limit }),
    enabled: Boolean(account),
    initialData: initialPages ? { pages: [initialPages], pageParams: [undefined] } : undefined,
    initialDataUpdatedAt: initialPages ? Date.now() : undefined,
    staleTime: StaleTime.NONE,
    getNextPageParam: (lastPage) => {
      return lastPage.length >= limit ? lastPage[lastPage.length - 1].follower : undefined;
    }
  });
};
