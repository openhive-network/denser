import { DEFAULT_PARAMS_FOR_FOLLOW, GetFollowParams, getFollowing } from '@/blog/lib/hive';
import { useInfiniteQuery } from '@tanstack/react-query';

export const useFollowingInfiniteQuery = (
  account: GetFollowParams['account'],
  limit: GetFollowParams['limit'] = DEFAULT_PARAMS_FOR_FOLLOW.limit
) => {
  return useInfiniteQuery(
    ['followingData', account],
    ({ pageParam: last_id }) => getFollowing({ account, start: last_id, limit }),
    {
      enabled: Boolean(account),
      getNextPageParam: (lastPage) => {
        return lastPage.length >= limit ? lastPage[lastPage.length - 1].following : undefined;
      }
    }
  );
};
