import { useQuery } from '@tanstack/react-query';
import { getActiveVotes } from '@transaction/lib/hive-api';

export const activeVotesQueryKey = (username: string, permlink: string) => [permlink, username, 'ActiveVotes'];

export const useActiveVotesQuery = (username: string, permlink: string) => {
  return useQuery({
    queryKey: activeVotesQueryKey(username, permlink),
    queryFn: () => getActiveVotes(username, permlink),
    enabled: Boolean(username) && Boolean(permlink)
  });
};

/** The vote list a `useActiveVotesQuery` elsewhere on the page has loaded; never fetches it. */
export const useLoadedActiveVotes = (username: string, permlink: string) => {
  return useQuery({
    queryKey: activeVotesQueryKey(username, permlink),
    queryFn: () => getActiveVotes(username, permlink),
    enabled: false
  }).data;
};
