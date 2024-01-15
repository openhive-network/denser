import { GetServerSideProps } from 'next';
import { getTranslations } from '@/auth/lib/get-translations';
import { LoginPanel } from '@smart-signer/components/login-panel';
import { loginPageController } from '@smart-signer/lib/login-page-controller';

export default function LoginPage() {
  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2
        sm:gap-0 sm:justify-around">
      <div className="flex flex-col gap-3 sm:gap-8 sm:mr-4">
        <LoginPanel />
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return {
    props: {
      ...(await loginPageController(ctx)),
      ...(await getTranslations(ctx)),
    }
  };
};
