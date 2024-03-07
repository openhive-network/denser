import { GetServerSideProps } from 'next';
import { getTranslations } from '@/auth/lib/get-translations';
import { loginPageController } from '@smart-signer/lib/login-page-controller';

// import { LoginPanel } from '@smart-signer/components/login-panel';
import { LoginPanel } from '@smart-signer/components/signin-panel';

export default function LoginPage() {

  return (
    <div className="mx-2 flex flex-col pt-10">
        <LoginPanel />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return {
    props: {
      ...(await loginPageController(ctx)),
      ...(await getTranslations(ctx))
    }
  };
};
