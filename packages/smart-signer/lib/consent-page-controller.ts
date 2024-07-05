import { oidc } from '@smart-signer/lib/oidc';
import { GetServerSideProps } from 'next';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

export const consentPageController: GetServerSideProps = async (ctx) => {
  const { req, res } = ctx;
  const uid = ctx.query.uid || '' as string;

  if (!oidc) {
    if (uid) return { notFound: true };
    return { props: {} };
  }

  // Only accept GET and POST requests.
  if (!['GET', 'POST'].includes(req.method || '')) return { notFound: true };

  if (req.method === 'POST') {
    // TODO Process submission
  }

  try {
    if (uid) {
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

        // Next code redirects to the interaction page.
        const result = { consent: { grantId } };
        await oidc.interactionFinished(
          ctx.req,
          ctx.res,
          result,
          { mergeWithLastSubmission: true }
        );
      }
    } else {
      logger.info('consentPageController: no uid');
    }
  } catch (e) {
    // throw e;
    // Do something wiser here.
    res.statusCode = 404;
    res.end();
  }

  return { props: {} };
};
