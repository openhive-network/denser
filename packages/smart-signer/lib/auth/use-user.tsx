import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Router from 'next/router';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import * as userLocalStorage from './user-localstore';
import { useLocalStorage } from 'usehooks-ts';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { defaultUser } from '@smart-signer/lib/auth/utils';
import { getLogger } from '@ui/lib/logging';
import { User } from '@smart-signer/types/common';

const logger = getLogger('app');

interface IUseUser {
  user: User;
}

async function getUser(): Promise<User> {
  return await fetchJson(`/api/users/me`);
}

export function useUser({ redirectTo = '', redirectIfFound = false } = {}): IUseUser {
  const [storedUser, storeUser] = useLocalStorage<User>('user', defaultUser);
  const { data: user } = useQuery<User>(
    [QUERY_KEY.user],
    async (): Promise<User> => getUser(),
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      initialData: storedUser,
      onError: () => {
        storeUser(defaultUser);
      }
    }
  );

  useEffect(() => {
    userLocalStorage.saveUser(user || defaultUser);
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
    user: user ?? defaultUser
  };
}
