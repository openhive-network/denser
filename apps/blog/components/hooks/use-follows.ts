import { useQuery } from '@tanstack/react-query';
import { getFollowCount } from '@transaction/lib/hive-api';

export const useFollowsQuery = (username: string) => {
  return useQuery({
    queryKey: ['followCountData', username],
    queryFn: () => getFollowCount(username),
    enabled: Boolean(username)
  });
};
