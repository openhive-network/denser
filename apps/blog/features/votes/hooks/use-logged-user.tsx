import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { netVests } from '@/blog/lib/utils';
import { getAccountFull, getManabar } from '@transaction/lib/hive-api';
import { LoggedUserContexts } from './logged-user-contexts';

export {
  useLoggedUserContext,
  useLoggedUserManabars,
  useLoggedUserNetVests
} from './logged-user-contexts';

export const LoggedUserProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUserClient();
  const { data: accountData } = useQuery({
    queryKey: ['loggedUserAccount', user.username],
    queryFn: () => getAccountFull(user.username),
    enabled: !!user.username
  });
  const { data: manabarsData } = useQuery({
    queryKey: ['manabars', user.username],
    queryFn: () => getManabar(user.username),
    enabled: !!user.username,
    refetchOnWindowFocus: false,
    refetchInterval: 60000
  });

  return (
    <LoggedUserContexts
      loggedUser={accountData}
      netVests={accountData ? netVests(accountData) : 0}
      manabars={manabarsData}
    >
      {children}
    </LoggedUserContexts>
  );
};
