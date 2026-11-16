'use client';

import { lazy, ReactNode, Suspense, useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { KeyType } from '@smart-signer/types/common';
import { OAUTH_AUTHORIZE_PATH } from '@smart-signer/lib/oauth/return-url';
import { SignInFormFrame } from '@smart-signer/components/auth/sign-in-form-shell';
import { siteConfig } from '@ui/config/site';
import { withBasePath } from '@ui/lib/path-utils';

// The sign-in form uses browser-only signers and wax: it is rendered on the client only, as the login
// dialog renders it, and the server sends the shell of its first view in its place.
const SignInForm = lazy(() => import('@smart-signer/components/auth/form'));

const subscribeToNothing = () => () => {};
const isOnClient = () => true;
const isOnServer = () => false;

interface LoginFormProps {
  oauthReturn: boolean;
  /** The form's first view, shown until the form is ready (`SignInFormShell`) */
  shell: ReactNode;
}

export default function LoginForm({ oauthReturn, shell }: LoginFormProps) {
  const router = useRouter();
  // False on the server and while hydrating, so the hydrated page keeps the server's shell
  const hydrated = useSyncExternalStore(subscribeToNothing, isOnClient, isOnServer);

  // Outside the OAuth flow a signed-in user has nothing to do here. In the OAuth flow
  // the server component resumes the request when the session allows it.
  useUserClient({
    redirectTo: oauthReturn ? undefined : '/',
    redirectIfFound: !oauthReturn
  });

  const onComplete = useCallback(
    async (_username: string) => {
      if (oauthReturn) {
        // A full navigation: the authorize endpoint reads the pending request from the session
        // and redirects to the OAuth client. Next does not prefix full navigations with basePath.
        window.location.assign(withBasePath(OAUTH_AUTHORIZE_PATH));
        return;
      }
      router.push('/');
    },
    [oauthReturn, router]
  );

  const framedShell = <SignInFormFrame>{shell}</SignInFormFrame>;

  return (
    <div className="flex justify-center">
      <div
        className="mt-16 w-full max-w-[380px] rounded-md p-4 sm:mt-32 sm:max-w-[450px]"
        data-testid="login-page"
      >
        {hydrated ? (
          <Suspense fallback={framedShell}>
            <SignInForm
              preferredKeyTypes={[KeyType.posting]}
              onComplete={onComplete}
              authenticateOnBackend={siteConfig.loginAuthenticateOnBackend}
              placeholder={shell}
            />
          </Suspense>
        ) : (
          framedShell
        )}
      </div>
    </div>
  );
}
