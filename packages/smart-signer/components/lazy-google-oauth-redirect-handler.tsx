'use client';

import { ComponentProps, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { cleanupStaleOAuthData } from '@smart-signer/lib/google-oauth-constants';

const GoogleOAuthRedirectHandler = dynamic(() => import('./google-oauth-redirect-handler'), { ssr: false });

type GoogleOAuthRedirectHandlerProps = ComponentProps<typeof GoogleOAuthRedirectHandler>;

/**
 * Mounts `GoogleOAuthRedirectHandler` only when the page is a return from a Google OAuth redirect
 * (`?google_auth=pending`). The handler signs the login with wax, so other pages do not load it.
 */
export function LazyGoogleOAuthRedirectHandler(props: GoogleOAuthRedirectHandlerProps) {
  const [isRedirectPending, setIsRedirectPending] = useState(false);

  useEffect(() => {
    cleanupStaleOAuthData();
    setIsRedirectPending(new URLSearchParams(window.location.search).get('google_auth') === 'pending');
  }, []);

  return isRedirectPending ? <GoogleOAuthRedirectHandler {...props} /> : null;
}
