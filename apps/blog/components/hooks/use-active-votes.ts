import { useQuery } from '@tanstack/react-query';
import { getActiveVotes } from '@transaction/lib/hive-api';

export const useActiveVotesQuery = (username: string, permlink: string) => {
  return useQuery({
    queryKey: [permlink, username, 'ActiveVotes'],
    queryFn: () => getActiveVotes(username, permlink),
    enabled: Boolean(username) && Boolean(permlink)
  });
};
