'use client';

import { useEffect, useRef } from 'react';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { getLogger } from '@hive/ui/lib/logging';

// Direct localStorage access is intentional: we read the user object
// that is stored by the login flow.
/* eslint-disable no-restricted-properties */

const logger = getLogger('app');

/**
 * Recovers the auth_proof HttpOnly cookie when the user is logged in
 * (per localStorage) but the cookie was lost (e.g., browser cleared session cookies).
 *
 * Without this cookie, SSR cannot identify the user and falls back to the
 * default observer, causing issues like missing grayed comments on first render.
 *
 * Uses a lightweight endpoint that sets a minimal observer cookie based on
 * the username from localStorage. No signing or user interaction required.
 *
 * Runs once per page load. Idempotent — skips if cookie already exists.
 */
export default function AuthCookieRecovery() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    recover();

    async function recover() {
      try {
        const userJson = localStorage.getItem('user');
        if (!userJson) return;

        const user = JSON.parse(userJson);
        if (!user?.isLoggedIn || !user?.username) return;

        await fetch('/api/auth/ensure-cookie', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [csrfHeaderName]: '1'
          },
          body: JSON.stringify({ username: user.username })
        });
      } catch (error) {
        // Silently fail — this is a best-effort recovery
        logger.debug('Auth cookie recovery failed: %o', error);
      }
    }
  }, []);

  return null;
}
