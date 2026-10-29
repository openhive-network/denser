'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LOGOUT_ANSWER_TIMEOUT_MS, whenLogoutDone } from '@smart-signer/lib/auth/logout-done';
import { TRENDING_PATH, isLeavingOnSignOut } from './sign-out-leave';

/**
 * Takes the reader to Trending when they sign out while on a signed-in-only list (For You), so the
 * URL, the title, the sort selector and the list agree. The header's sign-out navigates there itself
 * once the server has ended the session (startSignOutLeave), so this only covers a sign-out from
 * elsewhere, such as another tab, waiting for that tab's logout answer (up to
 * LOGOUT_ANSWER_TIMEOUT_MS) so Trending loads without the ended session's cookie. Opening the list
 * signed out does not count, nor does the logged-out user shown while the session is not hydrated
 * (an account's key check).
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
    if (!hasSignedOut || isLeavingOnSignOut()) return;
    return whenLogoutDone(LOGOUT_ANSWER_TIMEOUT_MS, () => router.replace(TRENDING_PATH));
  }, [hasSignedOut, router]);

  return hasSignedOut;
}
