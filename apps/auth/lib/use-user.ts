import { useEffect } from 'react'
import Router from 'next/router'
import useSWR from 'swr'
import { User } from 'pages/api/user'
import { fetchJsonUser } from '@/auth/lib/fetch-json';
import { useLocalStorage } from '@/auth/lib/use-local-storage';

export function useUser({
  redirectTo = '',
  redirectIfFound = false,
} = {}) {
  const { data: user, mutate: mutateUser } = useSWR<User>('/api/user', fetchJsonUser);

  const mutateAndStoreUser = async () => {
    const data = await mutateUser(arguments);
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
  }, [user, redirectIfFound, redirectTo])

  // return { user, mutateUser: mutateAndStoreUser }
  return { user, mutateUser }
}
