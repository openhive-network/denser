import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Router from 'next/router'
import { QUERY_KEY } from '@/auth/lib/query-keys';
import * as userLocalStorage from './user-localstore';
import { useLocalStorage } from '@/auth/lib/use-local-storage';
import { fetchJson } from '@/auth/lib/fetch-json';
import { User, defaultUser } from 'pages/api/user';
import { getLogger } from "@hive/ui/lib/logging";

const logger = getLogger('app');

interface IUseUser {
  user: User | null;
}

async function getUser(user: User | null | undefined): Promise<User | null> {
  // if (!user) return null;
  return await fetchJson(`/api/user`);
}


export function useUser({
  redirectTo = '',
  redirectIfFound = false,
} = {}): IUseUser {
  const [ storedUser, storeUser ] = useLocalStorage('user', defaultUser);
  const { data: user } = useQuery<User | null>([QUERY_KEY.user], async (): Promise<User | null> => getUser(user), {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: storedUser,
    onError: () => {
      storeUser(defaultUser);
    }
  });

  useEffect(() => {
    userLocalStorage.saveUser(user);
  }, [user]);

  useEffect(() => {
    // If no redirect needed, just return (example: already on
    // /dashboard). If user data not yet there (fetch in progress,
    // logged in or not) then don't do anything yet.
    if (!redirectTo || !user) {
      return;
    }

    if (
      // If redirectTo is set, redirect if the user was not found.
      (redirectTo && !redirectIfFound && !user?.isLoggedIn) ||
      // If redirectIfFound is also set, redirect if the user was found.
      (redirectIfFound && user?.isLoggedIn)
    ) {
      Router.push(redirectTo);
    }
  }, [user, redirectIfFound, redirectTo]);

  return {
    user: user ?? null,
  }
}
