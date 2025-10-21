'use client';

import { useRef } from 'react';
import { useUser } from '@smart-signer/lib/auth/use-user';
import SignInForm, { SignInFormRef } from '@smart-signer/components/auth/form';
import { KeyType } from '@smart-signer/types/common';
import { getLogger } from '@ui/lib/logging';
import { siteConfig } from '@ui/config/site';

const logger = getLogger('app');

interface LoginClientProps {
  redirectTo?: string;
}

export default function LoginClient({ redirectTo }: LoginClientProps) {
  const signInFormRef = useRef<SignInFormRef>(null);

  // Here we just check if user is already logged in and we redirect him
  // to profile page, if he is.
  const { user } = useUser({
    redirectTo: '/',
    redirectIfFound: true
  });

  const onComplete = async (username: string) => {
    if (redirectTo) {
      logger.info('LoginClient onComplete redirecting to: %s', redirectTo);
      location.replace(redirectTo);
    }
  };

  return (
    <div className="flex justify-center">
      <div className="mt-32 max-w-[380px] rounded-md p-0 sm:mt-auto sm:max-w-[450px] sm:px-0">
        <SignInForm
          ref={signInFormRef}
          preferredKeyTypes={[KeyType.posting]}
          onComplete={onComplete}
          authenticateOnBackend={siteConfig.loginAuthenticateOnBackend}
          strict={!siteConfig.allowNonStrictLogin}
        />
      </div>
    </div>
  );
}
