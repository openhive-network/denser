import { createContext, createElement, useContext, useDeferredValue, useMemo, type ReactNode } from 'react';
import type { FullAccount } from '@hive/common-hiveio-packages/wax';

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
};

const DEFAULT_REPUTATION = 25;

const LoggedUserContext = createContext<LoggedUserContextType | undefined>(undefined);
// Vote buttons (one per post and comment) need only this; it changes when the account
// loads, not on every manabar refetch.
const LoggedUserNetVestsContext = createContext(0);
// Manabars are refetched periodically; keeping them out of LoggedUserContext stops every
// account/reputation reader (e.g. the post editor) from re-rendering on each refetch.
const LoggedUserManabarsContext = createContext<Manabars | null | undefined>(undefined);

export const useLoggedUserContext = () => {
  const context = useContext(LoggedUserContext);
  if (!context) {
    throw new Error('useLoggedUserContext must be used within a LoggedUserProvider');
  }
  return context;
};

export const useLoggedUserNetVests = () => useContext(LoggedUserNetVestsContext);

export const useLoggedUserManabars = () => useContext(LoggedUserManabarsContext);

/**
 * Publishes the logged user's data through three contexts, so a consumer re-renders only
 * when the slice it reads changes: account/reputation, net vests, or manabars.
 * Written with createElement (not JSX) so node:test can load it through type stripping.
 */
export function LoggedUserContexts({
  loggedUser,
  netVests,
  manabars,
  children
}: {
  loggedUser: FullAccount | undefined;
  netVests: number;
  manabars: Manabars | null | undefined;
  children: ReactNode;
}) {
  const reputation = loggedUser?.reputation ?? DEFAULT_REPUTATION;
  const value = useMemo(
    () => ({ loggedUser, net_vests: netVests, reputation }),
    [loggedUser, netVests, reputation]
  );
  // When the account loads, every vote button re-renders to enable its weight slider.
  // At transition priority React renders that in slices instead of one long task.
  const deferredNetVests = useDeferredValue(netVests);

  return createElement(
    LoggedUserContext.Provider,
    { value },
    createElement(
      LoggedUserNetVestsContext.Provider,
      { value: deferredNetVests },
      createElement(LoggedUserManabarsContext.Provider, { value: manabars }, children)
    )
  );
}
