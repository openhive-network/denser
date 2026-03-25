import { cache } from 'react';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import type { IronSessionData, User } from '@smart-signer/types/common';
import { DEFAULT_OBSERVER } from './utils';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * Returns the observer username for SSR personalization.
 * This is an untrusted display hint — not an authentication check.
 *
 * Check order:
 * 1. observer cookie (lightweight, client-set on login)
 * 2. iron-session fallback (edge case: observer cookie missing but authenticated)
 * 3. DEFAULT_OBSERVER ('hive.blog')
 *
 * Wrapped with React.cache() to deduplicate across RSC calls within a request.
 */
export const getObserver = cache(async (): Promise<string> => {
  const cookieStore = cookies();

  // Primary: observer cookie (lightweight, client-set)
  const observerCookie = cookieStore.get('observer');
  if (observerCookie?.value) {
    const observer = observerCookie.value;
    if (/^[a-z0-9.-]{1,16}$/.test(observer)) {
      return observer;
    }
  }

  // Fallback: iron-session (edge case — observer cookie missing but user authenticated)
  try {
    const session = await getIronSession<IronSessionData>(cookieStore, sessionOptions);
    if (session.user?.username) {
      return session.user.username;
    }
  } catch (error) {
    logger.error(error, 'Error reading iron-session in getObserver:');
  }

  return DEFAULT_OBSERVER;
});

// Backward-compatible alias — will be removed after all call sites update
export const getObserverFromCookies = getObserver;

/**
 * Returns the cryptographically verified authenticated user, or null.
 * This is the ONLY authoritative source for "who is logged in."
 * Use getObserver() for SSR display hints; use this for authorization.
 */
export const getAuthenticatedUser = cache(async (): Promise<User | null> => {
  const cookieStore = cookies();
  try {
    const session = await getIronSession<IronSessionData>(cookieStore, sessionOptions);
    if (session.user?.isLoggedIn && session.user?.username) {
      return session.user;
    }
  } catch {
    // Session decryption failed
  }
  return null;
});
