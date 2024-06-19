import { GetServerSideProps } from 'next';
import { getTranslations } from '@/auth/lib/get-translations';
import ConsentPage from '@/auth/pages/consent';
import { consentPageController } from '@smart-signer/lib/consent-page-controller';

export default ConsentPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
    return {
      props: {
        ...(await consentPageController(ctx)),
        ...(await getTranslations(ctx)),
      }
    };
};
