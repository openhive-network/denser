import { GetServerSideProps } from 'next';
import { getTranslations } from '@/auth/lib/get-translations';
import { LoginPanel } from '@smart-signer/components/login-panel';
import { loginPageController } from '@smart-signer/lib/login-page-controller';

export default function LoginPage() {
  return (
    <div
      className="mx-2 flex flex-col gap-24 pt-16 sm:flex-row
        sm:justify-around sm:gap-0"
    >
      <div className="flex flex-col gap-3 sm:mr-4 sm:gap-8">
        <LoginPanel />
      </div>
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
