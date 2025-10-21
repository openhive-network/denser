import { useQuery } from '@tanstack/react-query';
import { getAccount } from '@transaction/lib/hive-api';

export const useAccountQuery = (username: string) => {
  return useQuery({
    queryKey: ['accountData', username],
    queryFn: () => getAccount(username),
    enabled: Boolean(username)
  });
};
