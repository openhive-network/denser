import { oidc, OidcClientDetails } from '@smart-signer/lib/oidc';
import { GetServerSideProps } from 'next';
import { getLogger } from '@ui/lib/logging';
import { getIronSession } from 'iron-session';
import { IronSessionData } from '@smart-signer/types/common';
import { sessionOptions } from './session';

const logger = getLogger('app');

export const consentPageController: GetServerSideProps = async (ctx) => {
  const { req, res } = ctx;
  const uid = ctx.query.uid || '' as string;

  if (!oidc) {
    if (uid) return { notFound: true };
    return { props: {} };
  }

  try {
    if (uid) {
      const interactionDetails = await oidc.interactionDetails(req, res);
      // logger.info('consentPageController interactionDetails: %o', interactionDetails);
      const {
        prompt: { name, details },
        params,
        session: { accountId },
      } = interactionDetails as any;

      if (name !== "consent") {
        // logger.info(`Invalid prompt name: ${name}, throwing error`);
        throw new Error(`Invalid prompt name: ${name}`);
      }

      const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
      const user = session.user;

      if (!user) {
        // logger.info('No user, throwing error');
        throw new Error('No user in session');
      }

      const clientDetails = await oidc.Client.find(params.client_id as string);
      const oidcClientDetails: OidcClientDetails = {
        clientId: params.client_id,
        clientName: clientDetails?.clientName || '',
        clientUri: clientDetails?.clientUri || '',
        logoUri: clientDetails?.logoUri || '',
        policyUri: clientDetails?.policyUri || '',
        tosUri: clientDetails?.tosUri || '',
      };

      if (Object.hasOwnProperty.call(user.oauthConsent, params.client_id)) {
        if (user?.oauthConsent[params.client_id]) {
          // User already consented to this client_id. We don't need to
          // display consent page.
          // logger.info('No need to display consent page');
        } else {
          // User already not consented to given client_id. We need to
          // complete oauth flow, because of negative consent.
          // logger.info('User did not consent');
          const result = {
            error: 'access_denied',
            error_description: 'End-User aborted interaction',
          };
          await oidc.interactionFinished(ctx.req, ctx.res, result, {
            mergeWithLastSubmission: false,
          });
          throw new Error('User did not consent');
        }
      } else {
        // User never consented nor not consented to given client_id. We
        // need to display consent page.
        // logger.info('We need to display consent page');
        return {
          props: {
            oidcClientDetails,
            redirectTo: interactionDetails.returnTo
          }
        };
      }

      // From here we build a successful grant object without asking
      // user about consent. We'll not display any consent page then.

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
    logger.error('Error in ConsentController: %o', e);
    // throw e;
    // Do something wiser here.
    res.statusCode = 404;
    res.end();
  }

  return { props: {} };
};
