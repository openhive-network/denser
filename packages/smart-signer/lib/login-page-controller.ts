import { GetServerSidePropsContext } from 'next';
import { oidc } from '@smart-signer/lib/oidc';
import { getLogger } from "@hive/ui/lib/logging";

const logger = getLogger('app');

export const loginPageController = async (ctx: GetServerSidePropsContext) => {
  try {
    const { req, res } = ctx;
    const slug = ctx.query.slug as string;
    if (slug) {
      const {
        uid, prompt, params, session, returnTo,
      } = await oidc.interactionDetails(req, res);
      logger.info('Login page: %o', {
        slug, uid, prompt, params, session, returnTo,
      });
    } else {
      logger.info('Login page: no slug');
    }
  } catch (e) {
    throw e;
  }

  return {};
};
