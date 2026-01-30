import { useInfiniteQuery } from '@tanstack/react-query';
import { IGetFollowParams, DEFAULT_PARAMS_FOR_FOLLOW, getFollowing } from '@transaction/lib/hive-api';
import { IFollow } from '@hive/common-hiveio-packages/wax';

export const useFollowingInfiniteQuery = (
  account: IGetFollowParams['account'],
  limit: IGetFollowParams['limit'] = DEFAULT_PARAMS_FOR_FOLLOW.limit,
  type?: string,
  extendedKey?: unknown[]
) => {
  return useInfiniteQuery({
    queryKey: ['followingData', account, ...(extendedKey || [])],
    queryFn: ({ pageParam: last_id }): Promise<IFollow[]> => getFollowing({ account, start: last_id, type, limit }),
    enabled: Boolean(account),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.length >= limit ? lastPage[lastPage.length - 1].following : undefined;
    }
  });
};
