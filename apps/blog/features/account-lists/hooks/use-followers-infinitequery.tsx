import { getFollowers } from '@transaction/lib/hive-api';
import { useInfiniteQuery } from '@tanstack/react-query';
import { DEFAULT_PARAMS_FOR_FOLLOW, IGetFollowParams } from '@transaction/lib/hive-api';
import { IFollow } from '@hive/common-hiveio-packages/wax';

export const useFollowersInfiniteQuery = (
  account: IGetFollowParams['account'],
  limit: IGetFollowParams['limit'] = DEFAULT_PARAMS_FOR_FOLLOW.limit
) => {
  return useInfiniteQuery({
    queryKey: ['followersData', account],
    queryFn: ({ pageParam: last_id }): Promise<IFollow[]> => getFollowers({ account, start: last_id, limit }),
    enabled: Boolean(account),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.length >= limit ? lastPage[lastPage.length - 1].follower : undefined;
    }
  });
};
