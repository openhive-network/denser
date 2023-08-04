import { getActiveVotes } from '@/blog/lib/hive';
import { useQuery } from '@tanstack/react-query';

export const useActiveVotesQuery = (username: string, permlink: string) => {
  return useQuery([permlink, username, 'ActiveVotes'], () => getActiveVotes(username, permlink), {
    enabled: Boolean(username) && Boolean(permlink)
  });
};
