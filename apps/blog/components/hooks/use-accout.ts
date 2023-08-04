import { getAccount } from '@/blog/lib/hive';
import { useQuery } from '@tanstack/react-query';

export const useAccountQuery = (username: string) => {
  return useQuery(['accountData', username], () => getAccount(username), {
    enabled: Boolean(username)
  });
};
