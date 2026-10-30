'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LOGOUT_ANSWER_TIMEOUT_MS, whenLogoutDone } from '@smart-signer/lib/auth/logout-done';
import { TRENDING_PATH, endSignOutLeave, isLeavingOnSignOut, showSignOutLeave } from './sign-out-leave';

interface SignOut {
  /** When this page saw the signed-out user, so a logout answer announced before it is not taken for this one */
  at: number;
  /** Whether the header's sign-out on this page started it, and so navigates itself */
  isLeavingAlready: boolean;
}

/**
 * Takes the reader to Trending when they sign out while on a signed-in-only list (For You), so the
 * URL, the title, the sort selector and the list agree. The header's sign-out navigates there itself
 * once the server has ended the session (startSignOutLeave), so this only covers a sign-out from
 * elsewhere, such as another tab, waiting for that tab's logout answer (up to
 * LOGOUT_ANSWER_TIMEOUT_MS) so Trending loads without the ended session's cookie. Opening the list
 * signed out does not count, nor does the logged-out user shown while the session is not hydrated
 * (an account's key check). Such a sign-out puts the page in the header's leaving state at once
 * (before the browser paints), so the sort selector names Trending over the skeleton.
 *
 * @returns true from the sign-out until the navigation replaces the page
 */
export function useTrendingOnSignOut(isLoggedIn: boolean, isHydrated: boolean): boolean {
  const router = useRouter();
  const [wasLoggedIn, setWasLoggedIn] = useState(isHydrated && isLoggedIn);
  const [signOut, setSignOut] = useState<SignOut | null>(null);

  if (isHydrated && isLoggedIn !== wasLoggedIn) {
    setWasLoggedIn(isLoggedIn);
    setSignOut(wasLoggedIn ? { at: Date.now(), isLeavingAlready: isLeavingOnSignOut() } : null);
  }

  useLayoutEffect(() => {
    if (signOut === null || signOut.isLeavingAlready) return;
    showSignOutLeave();
    return endSignOutLeave;
  }, [signOut]);

  useEffect(() => {
    if (signOut === null || signOut.isLeavingAlready) return;
    return whenLogoutDone(signOut.at, LOGOUT_ANSWER_TIMEOUT_MS, () => router.replace(TRENDING_PATH));
  }, [signOut, router]);

  return signOut !== null;
}
