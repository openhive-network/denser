import { useRef, useEffect, useCallback } from 'react';
import { GetServerSideProps, GetServerSidePropsResult, Redirect } from 'next';
import { useRouter } from 'next/router';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { loginPageController, LoginPageProps } from '@smart-signer/lib/login-page-controller';
import SignInForm, { SignInFormRef } from '@smart-signer/components/auth/form';
import { KeyType } from '@smart-signer/types/common';
import { getLogger } from '@ui/lib/logging';
import { siteConfig } from '@ui/config/site';

const logger = getLogger('app');

const GOOGLE_GSI_SCRIPT_ID = 'google-gsi-script';
const GOOGLE_GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

/**
 * Login page for OAuth2 flow.
 *
 * This page is used when:
 * 1. User is redirected here from /api/oauth/authorize (not logged in)
 * 2. After login, redirects back to /api/oauth/authorize to complete the flow
 *
 * The oauth_return query param indicates this is part of an OAuth flow.
 */
export default function LoginPage({ redirectTo, oauthReturn }: LoginPageProps) {
  const router = useRouter();
  const signInFormRef = useRef<SignInFormRef>(null);

  // Check if user is already logged in
  const { user } = useUser({
    redirectTo: oauthReturn ? undefined : '/',
    redirectIfFound: !oauthReturn,
  });

  // Load Google Sign-In script on mount
  const loadGoogleScript = useCallback(() => {
    if (!siteConfig.googleDrive.clientId) return;
    if (typeof document === 'undefined') return;
    // Use instanceof to prevent DOM clobbering attacks where user content
    // like `<a id="google-gsi-script">` could shadow a legitimate script element
    const existingElement = document.getElementById(GOOGLE_GSI_SCRIPT_ID);
    if (existingElement instanceof HTMLScriptElement) return;

    const script = document.createElement('script');
    script.id = GOOGLE_GSI_SCRIPT_ID;
    script.src = GOOGLE_GSI_SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    loadGoogleScript();
  }, [loadGoogleScript]);

  // If user is already logged in and this is an OAuth return, redirect to authorize
  useEffect(() => {
    if (user?.isLoggedIn && oauthReturn) {
      logger.info('LoginPage: user already logged in, redirecting to OAuth authorize');
      // Build the authorize URL - the session still has the OAuth state
      const authorizeUrl = new URL('/api/oauth/authorize', window.location.origin);
      // Copy the stored OAuth state params from session
      // The authorize handler will read them from session
      window.location.href = authorizeUrl.toString();
    }
  }, [user, oauthReturn]);

  const onComplete = async (username: string) => {
    logger.info('LoginPage onComplete: username=%s, oauthReturn=%s, redirectTo=%s',
      username, oauthReturn, redirectTo);

    if (oauthReturn) {
      // OAuth flow: redirect back to authorize endpoint
      // The session now has the authenticated user, and authorize will generate the code
      const authorizeUrl = new URL('/api/oauth/authorize', window.location.origin);
      // The OAuth state is in the session, authorize handler will read it
      window.location.href = authorizeUrl.toString();
    } else if (redirectTo) {
      // Legacy oidc-provider flow
      window.location.replace(redirectTo);
    } else {
      // Normal login, redirect to home
      router.push('/');
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-slate-50 dark:bg-slate-900">
      <div className="mt-16 w-full max-w-[380px] rounded-md p-4 sm:mt-32 sm:max-w-[450px]">
        <SignInForm
          ref={signInFormRef}
          preferredKeyTypes={[KeyType.posting]}
          onComplete={onComplete}
          authenticateOnBackend={siteConfig.loginAuthenticateOnBackend}
          strict={!siteConfig.allowNonStrictLogin}
        />
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const result: GetServerSidePropsResult<{ [key: string]: any }> & {
    redirect?: Redirect;
    props?: { [key: string]: any };
  } = await loginPageController(ctx);

  if (Object.hasOwnProperty.call(result, 'props')) {
    const output: GetServerSidePropsResult<{ [key: string]: any }> = {
      props: {
        ...result.props
      }
    };
    return output;
  }
  return result;
};
