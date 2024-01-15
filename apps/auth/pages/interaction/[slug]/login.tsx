import { GetServerSideProps } from 'next';
import { getTranslations } from '@/auth/lib/get-translations';
import LoginPage from '@/auth/pages/login';
import { loginPageController } from '@smart-signer/lib/login-page-controller';

export default LoginPage;

// export { loginPageController as getServerSideProps };

export const getServerSideProps: GetServerSideProps = async (ctx) => {
    return {
      props: {
        ...(await loginPageController(ctx)),
        ...(await getTranslations(ctx)),
      }
    };
};
