import { oidc } from '@/auth/lib/oidc';
import { getLogger } from "@hive/ui/lib/logging";
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const logger = getLogger('app');

export const loginPageController: GetServerSideProps = async (ctx) => {
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
    } catch(e) {
      throw e;
    }

    return {
      props: {
        ...(await serverSideTranslations(ctx.req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_auth']))
      }
    };
  };
