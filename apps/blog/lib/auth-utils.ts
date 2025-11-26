import { cookies } from 'next/headers';
import { parseAuthProofCookie, AUTH_PROOF_COOKIE_NAME } from '@hive/middleware/lib/auth-proof-cookie';
import { DEFAULT_OBSERVER } from './utils';

/**
 * Server-side function to extract observer from authentication cookies
 *
 * @returns {string} The observer from auth proof cookie, or empty string if not found
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
