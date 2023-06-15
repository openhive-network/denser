import { DEFAULT_PARAMS_FOR_FOLLOW, GetFollowParams, getFollowers } from '@/lib/hive';
import { useInfiniteQuery } from '@tanstack/react-query';

export const useFollowersInfiniteQuery = (
  account: GetFollowParams['account'],
  limit: GetFollowParams['limit'] = DEFAULT_PARAMS_FOR_FOLLOW.limit
) => {
  return useInfiniteQuery(
    ['followersData', account],
    ({ pageParam: last_id }) => getFollowers({ account, start: last_id, limit }),
    {
      enabled: Boolean(account),
      getNextPageParam: (lastPage) => {
        return lastPage.length >= limit ? lastPage[lastPage.length - 1].follower : undefined;
      }
    }
  );
};
