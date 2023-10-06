import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Router from 'next/router'
import { QUERY_KEY } from '../constants/queryKeys';
import { ResponseError } from '../ResponseError';
import * as userLocalStorage from './user.localstore';

async function getUser(user: User | null | undefined): Promise<User | null> {
  if (!user) return null;
  const response = await fetch(`/api/user`);
  if (!response.ok) {
    throw new ResponseError('Failed on get user request', response);
  }
  console.log('bamboo getUser', await response.json());
  return await response.json();
}

export interface User {
  isLoggedIn: boolean
  login: string
  avatarUrl: string
}

interface IUseUser {
  user: User | null;
}

export function useUser({
  redirectTo = '/',
  redirectIfFound = false,
} = {}) {
  const { data: user } = useQuery<User | null>([QUERY_KEY.user], async (): Promise<User | null> => getUser(user), {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: userLocalStorage.getUser,
    onError: () => {
      userLocalStorage.removeUser();
    }
  });

  console.log('bamboo user useUser 1', user);

  useEffect(() => {
    if (!user) userLocalStorage.removeUser();
    else userLocalStorage.saveUser(user);
  }, [user]);

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

  console.log('bamboo user useUser 2', user);
  return { user: user ?? { isLoggedIn: false, login: '', avatarUrl: '' } };
  // return user ?? null;
}
