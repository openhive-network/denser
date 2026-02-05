import { cache } from 'react';
import { cookies } from 'next/headers';
import { parseAuthProofCookie, AUTH_PROOF_COOKIE_NAME } from '@hive/middleware/lib/auth-proof-cookie';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import type { IronSessionData } from '@smart-signer/types/common';
import { DEFAULT_OBSERVER } from './utils';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * Server-side function to extract observer from authentication cookies.
 * Used for SSR prefetching to render content with the correct observer.
 *
 * Tries two sources:
 * 1. auth_proof cookie (lightweight, set by log_account endpoint)
 * 2. iron-session cookie (encrypted session, set by login endpoint)
 *
 * Wrapped with React.cache() to deduplicate iron-session decryption
 * across multiple RSC calls within the same request (e.g. layout + page).
 * Safe because all callers are RSC/route handlers (never 'use client').
 *
 * @returns {string} The username if logged in, or DEFAULT_OBSERVER for anonymous users
 */
export const getObserverFromCookies = cache(async (): Promise<string> => {
  const cookieStore = cookies();

  // Try auth_proof cookie first (fast, no decryption needed)
  const authCookie = cookieStore.get(AUTH_PROOF_COOKIE_NAME);
  if (authCookie) {
    const cookieData = parseAuthProofCookie(authCookie.value);
    if (cookieData?.username) {
      return cookieData.username;
    }
  }

  // Fallback: read iron-session (encrypted session cookie)
  try {
    const session = await getIronSession<IronSessionData>(cookieStore, sessionOptions);
    if (session.user?.username) {
      return session.user.username;
    }
  } catch (error) {
    logger.error(error, 'Error reading iron-session in getObserverFromCookies:');
  }

  return DEFAULT_OBSERVER;
});
