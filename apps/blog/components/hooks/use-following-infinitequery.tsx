import { DEFAULT_PARAMS_FOR_FOLLOW, IGetFollowParams, getFollowing } from '@transaction/lib/hive';
import { useInfiniteQuery } from '@tanstack/react-query';

export const useFollowingInfiniteQuery = (
  account: IGetFollowParams['account'],
  limit: IGetFollowParams['limit'] = DEFAULT_PARAMS_FOR_FOLLOW.limit,
  type?: string,
  extendedKey?: any[]
) => {
  return useInfiniteQuery(
    ['followingData', account, ...(extendedKey || [])],
    ({ pageParam: last_id }) => getFollowing({ account, start: last_id, type, limit }),
    {
      enabled: Boolean(account),
      getNextPageParam: (lastPage) => {
        return lastPage.length >= limit ? lastPage[lastPage.length - 1].following : undefined;
      }
    }
  );
};
