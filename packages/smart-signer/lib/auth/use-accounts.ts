import { useQuery } from '@tanstack/react-query';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import * as userLocalStorage from '@smart-signer/lib/auth/user-localstore';
import { User } from '@smart-signer/types/common';

/** Accounts signed in during this session, the current user among them, in sign-in order. */
export function useAccounts(): User[] {
  const { data } = useQuery<User[]>({
    queryKey: [QUERY_KEY.accounts],
    queryFn: () => userLocalStorage.getAccounts(),
    initialData: () => userLocalStorage.getAccounts(),
    staleTime: Infinity
  });
  return data;
}
