'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import * as userLocalStorage from './user-localstore';
import { useIsMounted, useLocalStorage } from 'usehooks-ts';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { defaultUser } from '@smart-signer/lib/auth/utils';
import { getLogger } from '@ui/lib/logging';
import { User } from '@smart-signer/types/common';

const isServer = typeof window === 'undefined';

const logger = getLogger('app');

interface IUseUser {
  user: User;
}

async function getUser(): Promise<User> {
  return await fetchJson(`/api/users/me`);
}

export function useUserClient({ redirectTo = '', redirectIfFound = false } = {}): IUseUser {
  if (isServer) return { user: defaultUser };
  const isMounted = useIsMounted();
  const [storedUser, storeUser] = useLocalStorage<User>('user', defaultUser);
  const { data: user } = useQuery<User>({
    queryKey: [QUERY_KEY.user],
    queryFn: async (): Promise<User> => getUser(),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: storedUser,
    onError: () => {
      storeUser(defaultUser);
    }
  });

  const router = useRouter();

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
      router.push(redirectTo);
    }
  }, [user, redirectIfFound, redirectTo, router]);

  return {
    user: !isMounted() || !user ? defaultUser : user
  };
}
