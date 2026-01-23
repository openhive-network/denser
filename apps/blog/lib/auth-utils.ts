import { cookies } from 'next/headers';
import { parseAuthProofCookie, AUTH_PROOF_COOKIE_NAME } from '@hive/middleware/lib/auth-proof-cookie';
import { DEFAULT_OBSERVER } from './utils';

/**
 * Server-side function to extract observer from authentication cookies.
 * Used for SSR prefetching to render content with the correct observer.
 *
 * @returns {string} The username from auth proof cookie if logged in, or DEFAULT_OBSERVER for anonymous users
 */
export function getObserverFromCookies(): string {
  const cookieStore = cookies();
  const authCookie = cookieStore.get(AUTH_PROOF_COOKIE_NAME);

  if (authCookie) {
    const cookieData = parseAuthProofCookie(authCookie.value);
    return cookieData?.username || DEFAULT_OBSERVER;
  }

  return DEFAULT_OBSERVER;
}
