import { useRef } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getTranslations } from '@/auth/lib/get-translations';
import { loginPageController } from '@smart-signer/lib/login-page-controller';
import SignInForm, { SignInFormRef } from '@smart-signer/components/auth/form';
import { KeyType } from '@smart-signer/types/common';

export default function LoginPage() {
  const router = useRouter();
  const signInFormRef = useRef<SignInFormRef>(null);

  // Here we just check if user is already logged in and we redirect him
  // to profile page, if he is.
  const { user } = useUser({
    redirectTo: '/',
    redirectIfFound: true
  });

  function onComplete() {
    router.push('/');
  }

  return (
    <div className="flex justify-center">
      <div className="mt-32 max-w-[380px] rounded-md p-0 sm:mt-auto sm:max-w-[450px] sm:px-0">
        <SignInForm
          ref={signInFormRef}
          preferredKeyTypes={[KeyType.posting]}
          onComplete={onComplete}
          // authenticateOnBackend={true}
          // strict={true}
        />
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
