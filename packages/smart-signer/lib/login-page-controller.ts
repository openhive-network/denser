import { oidc } from '@smart-signer/lib/oidc';
import { GetServerSideProps } from 'next';
import { getLogger } from '@ui/lib/logging';
import { getIronSession } from 'iron-session';
import { IronSessionData } from '@smart-signer/types/common';
import { sessionOptions } from './session';
import { siteConfig } from '@hive/ui/config/site';
import { getSafeRedirectUrl } from './redirect-validation';

const logger = getLogger('app');

export interface LoginPageProps {
  redirectTo?: string;
  oauthReturn?: boolean;
}

/**
 * Build the OAuth return URL from session state.
 * Used when user completes login and needs to return to OAuth flow.
 */
const buildOAuthReturnUrl = (oauthState: IronSessionData['oauthState']): string | null => {
  if (!oauthState) return null;

  const authorizeUrl = new URL('/api/oauth/authorize', siteConfig.url);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', oauthState.clientId);
  authorizeUrl.searchParams.set('redirect_uri', oauthState.redirectUri);
  if (oauthState.scope) {
    authorizeUrl.searchParams.set('scope', oauthState.scope);
  }
  if (oauthState.state) {
    authorizeUrl.searchParams.set('state', oauthState.state);
  }

  return authorizeUrl.toString();
};

export const loginPageController: GetServerSideProps = async (ctx) => {
  const { req, res } = ctx;
  const uid = ctx.query.uid || '' as string;
  const oauthReturn = ctx.query.oauth_return === 'true';

  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  const user = session.user;

  // Handle new OAuth flow (oauth_return=true)
  if (oauthReturn) {
    // If user is already logged in and this is an OAuth return,
    // redirect to the OAuth authorize endpoint
    if (user?.isLoggedIn && user.username && user.authenticateOnBackend && session.oauthState) {
      const returnUrl = buildOAuthReturnUrl(session.oauthState);
      if (returnUrl) {
        logger.info('loginPageController: OAuth return, user %s already logged in, redirecting to authorize', user.username);
        return {
          redirect: {
            destination: returnUrl,
            permanent: false,
          },
        };
      }
    }

    // User needs to log in, pass oauthReturn flag to the login page
    // so it knows to redirect after successful login
    return { props: { oauthReturn: true } };
  }

  // Legacy oidc-provider flow
  if (!oidc) {
    if (uid) return { notFound: true };
    return { props: {} };
  }

  try {
    if (uid) {
      const interactionDetails =
          await oidc.interactionDetails(req, res);
      // logger.info('loginPageController oauth interaction details: %o', interactionDetails);
      if (interactionDetails.uid !== uid) return { notFound: true };
      if (user?.username && user.authenticateOnBackend && interactionDetails.prompt?.name === 'login') {

        let allow = user.strict;
        if (!allow) {
          const client = await oidc.Client.find(interactionDetails.params.client_id as string);
          // logger.info('client: %o', client);
          allow = !!(client && client['urn:custom:client:allow-non-strict-login']);
        }

        if (!allow) {
          const result = {
            error: 'access_denied',
            error_description: 'End-User logged in non-strict mode',
          };
          await oidc.interactionFinished(ctx.req, ctx.res, result, {
            mergeWithLastSubmission: false,
          });
          const message = 'User logged in non-strict mode';
          logger.error('loginPageController in Oauth Flow: user %s. %s', user?.username, message);
          throw new Error(message);
        }

        logger.info('loginPageController: user already logged in and this is oauth flow');
        await oidc.interactionFinished(
          req,
          res,
          { login: { accountId: user.username } },
          { mergeWithLastSubmission: false }
        );
      }

      if (!siteConfig.loginAuthenticateOnBackend) {
        const result = {
          error: 'access_denied',
          error_description: 'End-User cannot be authenticated on server',
        };
        await oidc.interactionFinished(ctx.req, ctx.res, result, {
          mergeWithLastSubmission: false,
        });
        const message = 'User cannot be authenticated on server';
        logger.error('loginPageController in Oauth Flow: siteConfig.loginAuthenticateOnBackend is false. %s', message);
        throw new Error(message);
      }

      return { props: { redirectTo: getSafeRedirectUrl(interactionDetails.returnTo) } };
    } else {
      // logger.info('loginPageController: no uid, so we are not in oauth flow');
    }
  } catch (e) {
    // throw e;
    // Do something wiser here.
    res.statusCode = 404;
    res.end();
  }

  return { props: {} };
};
