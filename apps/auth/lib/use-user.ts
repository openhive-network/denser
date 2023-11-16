import { useEffect } from 'react'
import Router from 'next/router'
import useSWR from 'swr'
import { User } from 'pages/api/user'
import { fetchJson } from '@/auth/lib/fetch-json';
import { useLocalStorage } from '@/auth/lib/use-local-storage';
import { getLogger } from "@hive/ui/lib/logging";

const logger = getLogger('app');

export function useUser({
  redirectTo = '',
  redirectIfFound = false,
} = {}) {
  const { data: user, mutate: mutateUser, isLoading, isValidating, error } = useSWR<User>(
      '/api/user',
      fetchJson,
      {
        refreshInterval: 1000 * 60 * 60 * 4,
        revalidateIfStale: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      }
      );

  const storeUser = useLocalStorage('user', {})[1];

  const mutateAndStoreUser = async (...args: any[]) => {
    logger.info('mutateAndStoreUser arguments: %o', ...args);
    const data: User = await mutateUser() as User;
    storeUser(data);
    return data;
  };

  useEffect(() => {
    // If no redirect needed, just return (example: already on
    // /dashboard). If user data not yet there (fetch in progress,
    // logged in or not) then don't do anything yet.
    if (!redirectTo || !user) return

    if (
      // If redirectTo is set, redirect if the user was not found.
      (redirectTo && !redirectIfFound && !user?.isLoggedIn) ||
      // If redirectIfFound is also set, redirect if the user was found.
      (redirectIfFound && user?.isLoggedIn)
    ) {
      Router.push(redirectTo)
    }
  }, [user, redirectIfFound, redirectTo]);

  return { user, mutateUser: mutateAndStoreUser, isLoading, isValidating, error };
}
