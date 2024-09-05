import { useRef } from 'react';
import { GetServerSideProps, GetServerSidePropsResult, Redirect } from 'next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { loginPageController } from '@smart-signer/lib/login-page-controller';
import SignInForm, { SignInFormRef } from '@smart-signer/components/auth/form';
import { KeyType } from '@smart-signer/types/common';
import { getLogger } from '@ui/lib/logging';
import { getTranslations } from '../../../lib/get-translations';
import { siteConfig } from '@ui/config/site';

const logger = getLogger('app');

export default function LoginPage({ redirectTo }: { redirectTo?: string }) {
  const signInFormRef = useRef<SignInFormRef>(null);

  // Here we just check if user is already logged in and we redirect him
  // to profile page, if he is.
  const { user } = useUser({
    redirectTo: '/',
    redirectIfFound: true
  });

  const onComplete = async (username: string) => {
    if (redirectTo) {
      logger.info('LoginPage onComplete redirecting to: %s', redirectTo);
      location.replace(redirectTo);
    }
  }

  return (
    <div className="flex justify-center">
      <div className="mt-32 max-w-[380px] rounded-md p-0 sm:mt-auto sm:max-w-[450px] sm:px-0">
        <SignInForm
          ref={signInFormRef}
          preferredKeyTypes={[KeyType.posting]}
          onComplete={onComplete}
          authenticateOnBackend={siteConfig.loginAuthenticateOnBackend}
          strict={siteConfig.loginStrictMode}
        />
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const result: GetServerSidePropsResult<{ [key: string]: any }> & { redirect?: Redirect, props?: { [key: string]: any } }
      = await loginPageController(ctx);
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
