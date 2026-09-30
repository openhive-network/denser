import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import { buildOAuthReturnUrl } from '@smart-signer/lib/oauth/return-url';
import type { IronSessionData } from '@smart-signer/types/common';
import { getLogger } from '@ui/lib/logging';
import LoginContent from './content';

const logger = getLogger('app');

interface LoginPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

/**
 * The authorize URL that resumes the pending OAuth2 request when the session
 * already holds a user signed in on the backend, or null if they must sign in.
 */
async function getOAuthResumeUrl(): Promise<string | null> {
  try {
    const session = await getIronSession<IronSessionData>(cookies(), sessionOptions);
    const { user, oauthState } = session;
    if (!user?.isLoggedIn || !user.username || !user.authenticateOnBackend) return null;

    const resumeUrl = buildOAuthReturnUrl(oauthState);
    if (resumeUrl) {
      logger.info('LoginPage: OAuth return, user %s already logged in, redirecting to authorize', user.username);
    }
    return resumeUrl;
  } catch (error) {
    logger.error(error, 'LoginPage: failed to read the session');
    return null;
  }
}

/**
 * Sign-in page. /api/oauth/authorize sends signed-out users here with
 * oauth_return=true and completes the OAuth2 request once they have signed in.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const oauthReturn = searchParams.oauth_return === 'true';

  if (oauthReturn) {
    // Outside the try/catch above: redirect() works by throwing.
    const resumeUrl = await getOAuthResumeUrl();
    if (resumeUrl) redirect(resumeUrl);
  }

  return <LoginContent oauthReturn={oauthReturn} />;
}
