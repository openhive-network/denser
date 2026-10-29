'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FOR_YOU_SORT } from '@/blog/lib/utils';

const TRENDING_PATH = '/trending';
const FOR_YOU_PATH = `/${FOR_YOU_SORT}`;

/**
 * Where signing out on `pathname` takes the reader: Trending from a signed-in-only list (For You),
 * otherwise nowhere (undefined).
 */
export function signOutDestination(pathname: string | null): string | undefined {
  return pathname === FOR_YOU_PATH ? TRENDING_PATH : undefined;
}

/**
 * Takes the reader to Trending when they sign out while on a signed-in-only list (For You), so the
 * URL, the title, the sort selector and the list agree. The header's sign-out already starts that
 * navigation (signOutDestination); this covers a sign-out from elsewhere, such as another tab.
 * Opening the list signed out does not count, nor does the logged-out user shown while the session
 * is not hydrated (an account's key check).
 *
 * @returns true from the sign-out until the navigation replaces the page
 */
export function useTrendingOnSignOut(isLoggedIn: boolean, isHydrated: boolean): boolean {
  const router = useRouter();
  const [wasLoggedIn, setWasLoggedIn] = useState(isHydrated && isLoggedIn);
  const [hasSignedOut, setHasSignedOut] = useState(false);

  if (isHydrated && isLoggedIn !== wasLoggedIn) {
    setWasLoggedIn(isLoggedIn);
    setHasSignedOut(wasLoggedIn);
  }

  useEffect(() => {
    if (hasSignedOut) router.replace(TRENDING_PATH);
  }, [hasSignedOut, router]);

  return hasSignedOut;
}
