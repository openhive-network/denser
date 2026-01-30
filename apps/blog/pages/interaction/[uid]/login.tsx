import { useRef } from 'react';
import { GetServerSideProps, GetServerSidePropsResult, Redirect } from 'next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { loginPageController } from '@smart-signer/lib/login-page-controller';
import SignInForm, { SignInFormRef } from '@smart-signer/components/auth/form';
import { KeyType } from '@smart-signer/types/common';
import { getLogger } from '@ui/lib/logging';
import { siteConfig } from '@ui/config/site';

const logger = getLogger('app');

export default function LoginPage({ redirectTo }: { redirectTo?: string }) {
  const signInFormRef = useRef<SignInFormRef>(null);

  // Here we just check if user is already logged in and we redirect him
  // to profile page, if he is.
  useUser({
    redirectTo: '/',
    redirectIfFound: true
  });

  const onComplete = async (_username: string) => {
    if (redirectTo) {
      logger.info('LoginPage onComplete redirecting to: %s', redirectTo);
      location.replace(redirectTo);
    }
  };

  return (
    <div className="flex justify-center">
      <div className="mt-32 max-w-[380px] rounded-md p-0 sm:mt-auto sm:max-w-[450px] sm:px-0">
        <SignInForm
          ref={signInFormRef}
          preferredKeyTypes={[KeyType.Posting]}
          onComplete={onComplete}
          authenticateOnBackend={siteConfig.loginAuthenticateOnBackend}
          strict={!siteConfig.allowNonStrictLogin}
        />
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loginPageController returns dynamic props structure
  const result: GetServerSidePropsResult<{ [key: string]: any }> & {
    redirect?: Redirect;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic props from login controller
    props?: { [key: string]: any };
  } = await loginPageController(ctx);
  if (Object.hasOwnProperty.call(result, 'props')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic props from login controller
    const output: GetServerSidePropsResult<{ [key: string]: any }> = {
      props: {
        ...result.props
      }
    };
    return output;
  }
  return result;
};
