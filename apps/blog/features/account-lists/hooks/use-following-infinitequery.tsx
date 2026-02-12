import { useInfiniteQuery } from '@tanstack/react-query';
import { IGetFollowParams, DEFAULT_PARAMS_FOR_FOLLOW, getFollowing } from '@transaction/lib/hive-api';
import { IFollow } from '@hive/common-hiveio-packages/wax';
import { StaleTime } from '@/blog/lib/react-query';

export const useFollowingInfiniteQuery = (
  account: IGetFollowParams['account'],
  limit: IGetFollowParams['limit'] = DEFAULT_PARAMS_FOR_FOLLOW.limit,
  type?: string,
  extendedKey?: string[],
  initialPages?: IFollow[] | null
) => {
  return useInfiniteQuery({
    queryKey: ['followingData', account, ...(extendedKey || [])],
    queryFn: ({ pageParam: last_id }) => getFollowing({ account, start: last_id, type, limit }),
    enabled: Boolean(account),
    initialData: initialPages ? { pages: [initialPages], pageParams: [undefined] } : undefined,
    initialDataUpdatedAt: initialPages ? Date.now() : undefined,
    staleTime: StaleTime.NONE,
    getNextPageParam: (lastPage) => {
      return lastPage.length >= limit ? lastPage[lastPage.length - 1].following : undefined;
    }
  });
};
