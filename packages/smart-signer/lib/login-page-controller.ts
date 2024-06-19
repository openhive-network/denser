import { GetServerSidePropsContext } from 'next';
import { oidc } from '@smart-signer/lib/oidc';
import { GetServerSideProps } from 'next';
import { getTranslations } from '@/auth/lib/get-translations';
import { getLogger } from '@ui/lib/logging';
import { loginUser } from './api-handlers/auth/login';
import { parseBody } from "next/dist/server/api-utils/node/parse-body.js"

const logger = getLogger('app');



export const loginPageController: GetServerSideProps = async (ctx) => {
  // logger.info('loginPageController ctx: %o', ctx);
  const { req, res } = ctx;
  const slug = ctx.query.slug || '' as string;

  // only accept GET and POST requests
  if (!['GET', 'POST'].includes(req.method || '')) return { notFound: true };

  if (req.method === 'POST') {
    // process submission
    // return redirect(303, '/interaction/' + slug + '/login');

    const myRequest = req;
    myRequest.query = ctx.query;

    const body = await parseBody(req, "1mb");
    myRequest.body = body;

    const user = await loginUser(myRequest, res);
    logger.info('loginPageController user: %o', user);

    return await oidc.interactionFinished(req, res, {accountId: user.username}, {
      mergeWithLastSubmission: false
    });

    // return {
    //   redirect: {
    //     destination: '/',
    //     permanent: false,
    //   },
    // }
  }

  try {
    if (slug) {
      const { uid, prompt, params, session, returnTo } =
          await oidc.interactionDetails(req, res);
      logger.info('loginPageController details: %o', {
        slug,
        uid,
        prompt,
        params,
        session,
        returnTo
      });
    } else {
      logger.info('loginPageController: no slug');
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
