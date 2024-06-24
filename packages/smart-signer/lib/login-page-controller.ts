import { oidc } from '@smart-signer/lib/oidc';
import { GetServerSideProps } from 'next';
import { getLogger } from '@ui/lib/logging';
import { getIronSession } from 'iron-session';
import { IronSessionData } from '@smart-signer/types/common';
import { sessionOptions } from './session';

const logger = getLogger('app');

export interface LoginPageProps {
  redirectTo?: string
}

export const loginPageController: GetServerSideProps = async (ctx) => {
  if (!oidc) {
    return { props: {} };
  }

  const { req, res } = ctx;
  const uid = ctx.query.uid || '' as string;

  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  const user = session.user;

  try {
    if (uid) {
      const interactionDetails =
          await oidc.interactionDetails(req, res);
      logger.info('loginPageController oauth interaction details: %o',
          interactionDetails);
      if (interactionDetails.uid !== uid) return { notFound: true };
      if (user?.username && interactionDetails.prompt?.name === 'login') {
        logger.info('loginPageController: user already logged in and this is oauth flow');
        await oidc.interactionFinished(
          req,
          res,
          { login: { accountId: user.username } },
          { mergeWithLastSubmission: false }
        );
      }
      return { props: { redirectTo: interactionDetails.returnTo } };
    } else {
      logger.info('loginPageController: no uid, so we are not in oauth flow');
    }
  } catch (e) {
    throw e;
  }

  return { props: {} };
};
