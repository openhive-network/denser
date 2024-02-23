import { getFollowCount } from '@ui/lib/hive';
import { useQuery } from '@tanstack/react-query';

export const useFollowsQuery = (username: string) => {
  return useQuery(['followCountData', username], () => getFollowCount(username), {
    enabled: Boolean(username)
  });
};
