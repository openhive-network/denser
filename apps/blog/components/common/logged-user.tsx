import { useUser } from '@smart-signer/lib/auth/use-user';
import { createContext, FC, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { netVests } from '@/blog/lib/utils';
import { FullAccount } from '@transaction/lib/app-types';
import { getAccount } from '@transaction/lib/hive-api';

type LoggedUserContextType = {
  loggedUser: FullAccount | undefined;
  net_vests: number;
};

export const loggedUserContext = createContext<LoggedUserContextType | undefined>(undefined);

export const useLoggedUserContext = () => {
  const context = useContext(loggedUserContext);
  if (!context) {
    throw new Error('useLoggedUserContext must be used within a LoggedUserProvider');
  }
  return context;
};

export const LoggedUserProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const { data: accountData } = useQuery(['accountData', user.username], () => getAccount(user.username), {
    enabled: !!user.username
  });
  const net_vests = accountData ? netVests(accountData) : 0;

  return (
    <loggedUserContext.Provider value={{ loggedUser: accountData, net_vests: net_vests }}>
      <>{children}</>
    </loggedUserContext.Provider>
  );
};
