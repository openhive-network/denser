import { GetServerSidePropsContext } from 'next';
import { oidc } from '@smart-signer/lib/oidc';
import { GetServerSideProps } from 'next';
import { getTranslations } from '@/auth/lib/get-translations';
import { getLogger } from '@ui/lib/logging';
import { loginUser } from './api-handlers/auth/login';
import { parseBody } from "next/dist/server/api-utils/node/parse-body.js"

const logger = getLogger('app');



export const consentPageController: GetServerSideProps = async (ctx) => {
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
      const interactionDetails = await oidc.interactionDetails(req, res);
      logger.info('consentPageController interactionDetails: %o', interactionDetails);
      const {
        prompt: { name, details },
        params,
        session: { accountId },
      } = interactionDetails as any;

      if (name !== "consent") {
        throw new Error(`Invalid prompt name: ${name}`);
      }

      const grant = interactionDetails.grantId
      ? await oidc.Grant.find(interactionDetails.grantId)
      : new oidc.Grant({
          accountId,
          clientId: params.client_id as string,
        });

      if (grant) {
        if (details.missingOIDCScope) {
          grant.addOIDCScope(details.missingOIDCScope.join(" "));
        }
        if (details.missingOIDCClaims) {
          grant.addOIDCClaims(details.missingOIDCClaims);
        }
        if (details.missingResourceScopes) {
          for (const [indicator, scopes] of Object.entries(
            details.missingResourceScopes
          )) {
            grant.addResourceScope(indicator, (scopes as any).join(" "));
          }
        }

        const grantId = await grant.save();

        const result = { consent: { grantId } };
        await oidc.interactionFinished(ctx.req, ctx.res, result, {
          mergeWithLastSubmission: true,
        });
      }


    } else {
      logger.info('consentPageController: no slug');
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
