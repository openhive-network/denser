import { GetServerSideProps, GetServerSidePropsResult, Redirect } from 'next';
import { getTranslations } from '@/auth/lib/get-translations';
import ConsentPage from '@/auth/pages/consent';
import { consentPageController } from '@smart-signer/lib/consent-page-controller';
import { siteConfig } from '@ui/config/site';

export default ConsentPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  if (!siteConfig.oidcEnabled) return { notFound: true };
  const result: GetServerSidePropsResult<{ [key: string]: any }> & { redirect?: Redirect, props?: { [key: string]: any } } = await consentPageController(ctx);
  if (Object.hasOwnProperty.call(result, 'props')) {
    const output: GetServerSidePropsResult<{ [key: string]: any }> = {
      props: {
        ...result.props,
        ...(await getTranslations(ctx)),
      },
    };
    return output;
  }
  return result;
};
