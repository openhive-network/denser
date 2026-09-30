'use client';

import { useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { KeyType } from '@smart-signer/types/common';
import { siteConfig } from '@ui/config/site';
import { getLogger } from '@ui/lib/logging';

// Rendered in the browser only, as in the login dialog: the form prefills the
// last username from localStorage and signs through the hb-auth worker.
const SignInForm = dynamic(() => import('@smart-signer/components/auth/form'), { ssr: false });

const logger = getLogger('app');

const GOOGLE_GSI_SCRIPT_ID = 'google-gsi-script';
const GOOGLE_GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const OAUTH_AUTHORIZE_PATH = '/api/oauth/authorize';

function loadGoogleScript() {
  if (!siteConfig.googleDrive.clientId) return;
  // Use instanceof to prevent DOM clobbering attacks where user content
  // like `<a id="google-gsi-script">` could shadow a legitimate script element
  const existingElement = document.getElementById(GOOGLE_GSI_SCRIPT_ID);
  if (existingElement instanceof HTMLScriptElement) return;

  const script = document.createElement('script');
  script.id = GOOGLE_GSI_SCRIPT_ID;
  script.src = GOOGLE_GSI_SCRIPT_SRC;
  script.async = true;
  document.body.appendChild(script);
}

interface LoginContentProps {
  oauthReturn: boolean;
}

export default function LoginContent({ oauthReturn }: LoginContentProps) {
  const router = useRouter();

  // Outside the OAuth flow a signed-in user is sent home. Inside it, this
  // client-side state is not used to resume the request: it comes from
  // localStorage, which can outlive the session cookie, and would bounce the
  // browser between here and the authorize endpoint. The server component
  // resumes the request when the session really holds a signed-in user.
  useUserClient({
    redirectTo: oauthReturn ? undefined : '/',
    redirectIfFound: !oauthReturn
  });

  useEffect(() => {
    loadGoogleScript();
  }, []);

  const onComplete = useCallback(
    async (username: string) => {
      logger.info('LoginPage onComplete: username=%s, oauthReturn=%s', username, oauthReturn);
      if (oauthReturn) {
        // The session now holds the user and the pending OAuth request,
        // so the authorize endpoint can issue the code.
        window.location.href = new URL(OAUTH_AUTHORIZE_PATH, window.location.origin).toString();
        return;
      }
      router.push('/');
    },
    [oauthReturn, router]
  );

  return (
    <div className="flex justify-center px-4">
      <div className="mt-16 w-full max-w-[380px] rounded-md border bg-background shadow-lg sm:mt-32 sm:max-w-[450px]">
        <SignInForm
          preferredKeyTypes={[KeyType.posting]}
          onComplete={onComplete}
          authenticateOnBackend={siteConfig.loginAuthenticateOnBackend}
          strict={!siteConfig.allowNonStrictLogin}
        />
      </div>
    </div>
  );
}
