import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { createContext, FC, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { netVests } from '@/blog/lib/utils';
import { FullAccount } from '@hive/common-hiveio-packages/wax';
import { getAccountFull, getManabar } from '@transaction/lib/hive-api';

interface SingleManabar {
  max: string;
  current: string;
  percentageValue: number;
  cooldown: Date;
}

interface Manabars {
  upvote: SingleManabar;
  downvote: SingleManabar;
  rc: SingleManabar;
}

type LoggedUserContextType = {
  loggedUser: FullAccount | undefined;
  net_vests: number;
  reputation: number;
  manabarsData: Manabars | null | undefined;
};

const LoggedUserContext = createContext<LoggedUserContextType | undefined>(undefined);

export const useLoggedUserContext = () => {
  const context = useContext(LoggedUserContext);
  if (!context) {
    throw new Error('useLoggedUserContext must be used within a LoggedUserProvider');
  }
  return context;
};

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
  const net_vests = accountData ? netVests(accountData) : 0;
  const reputation = accountData?.reputation ?? 25;

  return (
    <LoggedUserContext.Provider value={{ loggedUser: accountData, net_vests, reputation, manabarsData }}>
      {children}
    </LoggedUserContext.Provider>
  );
};
