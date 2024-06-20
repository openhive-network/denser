import { GetServerSidePropsContext } from 'next';
import { oidc } from '@smart-signer/lib/oidc';
import { GetServerSideProps } from 'next';
import { getTranslations } from '@/auth/lib/get-translations';
import { getLogger } from '@ui/lib/logging';
import { loginUser } from './api-handlers/auth/login';
import { parseBody } from "next/dist/server/api-utils/node/parse-body.js"
import { getIronSession } from 'iron-session';
import { IronSessionData } from '@smart-signer/types/common';
import { sessionOptions } from './session';

const logger = getLogger('app');



export const loginPageController: GetServerSideProps = async (ctx) => {
  // logger.info('loginPageController ctx: %o', ctx);
  const { req, res } = ctx;
  // only accept GET and POST requests
  if (!['GET', 'POST'].includes(req.method || '')) return { notFound: true };

  const slug = ctx.query.slug || '' as string;

  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  const user = session.user;


  if (req.method === 'POST') {
    logger.info('loginPageController POST');

    // const myRequest = req;
    // myRequest.query = ctx.query;

    // myRequest.body = body;
    // const user = await loginUser(myRequest, res);
    // logger.info('loginPageController user: %o', user);

    let body;
    try {
      body = JSON.parse(await parseBody(req, "1mb"));
      logger.info('loginPageController body: %o', body);
    } catch (error) {
      // do nothing
    }

    if (body.user.username === user?.username) {
      logger.info('loginPageController redirecting to interaction page');
      await oidc.interactionFinished(
        req,
        res,
        { login: { accountId: user?.username || '' } },
        { mergeWithLastSubmission: false }
      );
    }
  }

  try {
    if (slug) {
      const { uid, prompt, params, session, returnTo } =
          await oidc.interactionDetails(req, res);
      logger.info('loginPageController oauth interaction details: %o', {
        slug,
        uid,
        prompt,
        params,
        session,
        returnTo
      });
      if (slug !== uid) return { notFound: true };
      if (user?.username && prompt?.name === 'login') {
        logger.info('loginPageController: user already logged in and this is oauth flow');
        await oidc.interactionFinished(
          req,
          res,
          { login: { accountId: user.username } },
          { mergeWithLastSubmission: false }
        );
      }
    } else {
      logger.info('loginPageController: no slug, so we are not in oauth flow');
    }
  } catch (e) {
    throw e;
  }

  return {
    props: {
      ...(await getTranslations(ctx))
    }
  };

};
