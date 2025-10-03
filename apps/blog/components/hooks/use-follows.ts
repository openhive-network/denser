import { useQuery } from '@tanstack/react-query';
import { getFollowCount } from '@transaction/lib/hive-api';

export const useFollowsQuery = (username: string) => {
  return useQuery(['followCountData', username], () => getFollowCount(username), {
    enabled: Boolean(username)
  });
};
