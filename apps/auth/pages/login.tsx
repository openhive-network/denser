import { useRef } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { loginPageController } from '@smart-signer/lib/login-page-controller';
import SignInForm, { SignInFormRef } from '@smart-signer/components/auth/form';
import { KeyType } from '@smart-signer/types/common';
import { getLogger } from '@ui/lib/logging';
import { getTranslations } from '@/auth/lib/get-translations';

const logger = getLogger('app');

export default function LoginPage({ redirectTo }: { redirectTo?: string }) {
  const signInFormRef = useRef<SignInFormRef>(null);
  const router = useRouter();
  const slug = router.query.slug as string;

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
          authenticateOnBackend={true}
          strict={true}
        />
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const result = await loginPageController(ctx);
  if (Object.hasOwnProperty.call(result, 'props')) {
    const output = {};
    output.props = {
      ...result.props,
      ...(await getTranslations(ctx)),
    };
    return output;
  }
  return result;
};
