import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { createContext, FC, useContext, useDeferredValue, useMemo } from 'react';
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
// Vote buttons (one per post and comment) need only this; it changes when the account
// loads, not on every manabar refetch.
const LoggedUserNetVestsContext = createContext(0);

export const useLoggedUserContext = () => {
  const context = useContext(LoggedUserContext);
  if (!context) {
    throw new Error('useLoggedUserContext must be used within a LoggedUserProvider');
  }
  return context;
};

export const useLoggedUserNetVests = () => useContext(LoggedUserNetVestsContext);

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
  const value = useMemo(
    () => ({ loggedUser: accountData, net_vests, reputation, manabarsData }),
    [accountData, net_vests, reputation, manabarsData]
  );
  // When the account loads, every vote button re-renders to enable its weight slider.
  // At transition priority React renders that in slices instead of one long task.
  const deferredNetVests = useDeferredValue(net_vests);

  return (
    <LoggedUserContext.Provider value={value}>
      <LoggedUserNetVestsContext.Provider value={deferredNetVests}>{children}</LoggedUserNetVestsContext.Provider>
    </LoggedUserContext.Provider>
  );
};
