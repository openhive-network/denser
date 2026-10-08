import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import { buildOAuthReturnUrl } from '@smart-signer/lib/oauth/return-url';
import { siteConfig } from '@ui/config/site';
import type { IronSessionData } from '@smart-signer/types/common';
import LoginForm from './login-form';

interface LoginPageProps {
  searchParams: Promise<{ oauth_return?: string | string[] }>;
}

/**
 * The URL that resumes a pending OAuth request, when the session can complete it without a new login.
 * Read from the session cookie rather than client state: client state can outlive the session and
 * would bounce the browser between /login and /api/oauth/authorize.
 */
async function getPendingOAuthReturnUrl(): Promise<string | null> {
  const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions);
  const { user, oauthState } = session;
  if (!user?.isLoggedIn || !user.username || !user.authenticateOnBackend) return null;
  return buildOAuthReturnUrl(oauthState, siteConfig.url);
}

/**
 * Standalone sign-in page. /api/oauth/authorize sends signed-out users here with
 * `oauth_return=true`; after signing in they are sent back to complete the OAuth request.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const oauthReturn = (await searchParams).oauth_return === 'true';

  if (oauthReturn) {
    const returnUrl = await getPendingOAuthReturnUrl();
    if (returnUrl) redirect(returnUrl);
  }

  return <LoginForm oauthReturn={oauthReturn} />;
}
