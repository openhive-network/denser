import { oidc } from '@smart-signer/lib/oidc';
import { GetServerSideProps } from 'next';
import { getLogger } from '@ui/lib/logging';
import { getIronSession } from 'iron-session';
import { IronSessionData } from '@smart-signer/types/common';
import { sessionOptions } from './session';
import { siteConfig } from '@hive/ui/config/site';

const logger = getLogger('app');

export interface LoginPageProps {
  redirectTo?: string
}

export const loginPageController: GetServerSideProps = async (ctx) => {
  const { req, res } = ctx;
  const uid = ctx.query.uid || '' as string;

  if (!oidc) {
    if (uid) return { notFound: true };
    return { props: {} };
  }

  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  const user = session.user;

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

      return { props: { redirectTo: interactionDetails.returnTo } };
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
