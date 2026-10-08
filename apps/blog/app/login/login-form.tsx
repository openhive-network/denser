'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { KeyType } from '@smart-signer/types/common';
import { siteConfig } from '@ui/config/site';

// The sign-in form uses browser-only signers and wax: render it on the client, as the login dialog does.
const SignInForm = dynamic(() => import('@smart-signer/components/auth/form'), { ssr: false });

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

interface LoginFormProps {
  oauthReturn: boolean;
}

export default function LoginForm({ oauthReturn }: LoginFormProps) {
  const router = useRouter();

  // Outside the OAuth flow a signed-in user has nothing to do here. In the OAuth flow
  // the server component resumes the request when the session allows it.
  useUserClient({
    redirectTo: oauthReturn ? undefined : '/',
    redirectIfFound: !oauthReturn
  });

  useEffect(() => {
    loadGoogleScript();
  }, []);

  const onComplete = useCallback(
    async (_username: string) => {
      if (oauthReturn) {
        // A full navigation: the authorize endpoint reads the pending request from the session
        // and redirects to the OAuth client.
        window.location.assign(OAUTH_AUTHORIZE_PATH);
        return;
      }
      router.push('/');
    },
    [oauthReturn, router]
  );

  return (
    <div className="flex justify-center">
      <div
        className="mt-16 w-full max-w-[380px] rounded-md p-4 sm:mt-32 sm:max-w-[450px]"
        data-testid="login-page"
      >
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
