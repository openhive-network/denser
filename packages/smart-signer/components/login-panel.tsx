import { useState, useEffect } from 'react';

import { useRouter } from 'next/router';
import { LoginType } from '@smart-signer/types/common';
import { getCookie } from '@smart-signer/lib/utils';
import { Signatures, PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { useSignIn } from '@smart-signer/lib/auth/use-sign-in';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { LoginForm, LoginFormSchema } from '@smart-signer/components/login-form';
import { cookieNamePrefix } from '@smart-signer/lib/session';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { useSigner } from '@smart-signer/lib/use-signer';
import { TTransactionPackType } from '@hiveio/wax';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

interface LoginPanelOptions {
  authenticateOnBackend: boolean;
  strict: boolean; // if true use strict authentication
  i18nNamespace?: string;
}

export function LoginPanel({ authenticateOnBackend, strict }: LoginPanelOptions) {
  const router = useRouter();
  const [loginChallenge, setLoginChallenge] = useState('');
  const { signerOptions } = useSigner();
  const [errorMsg, setErrorMsg] = useState('');
  const signIn = useSignIn();

  useEffect(() => {
    setLoginChallenge(getCookie(`${cookieNamePrefix}login_challenge`));
  }, []);

  // Here we just check if user is already logged in and we redirect him
  // to profile page, if he is.
  const { user } = useUser({
    redirectTo: '/',
    redirectIfFound: true
  });

  const onSubmit = async (data: LoginFormSchema) => {
    logger.info('onSubmit form data', data);
    setErrorMsg('');

    const { loginType, username, keyType } = data;
    const signatures: Signatures = { posting: '', active: '' };
    let hivesignerToken = '';

    const loginSignerOptions: SignerOptions = {
      ...signerOptions,
      ...{
        username,
        loginType,
        keyType
      }
    };

    try {
      let password = '';
      if (data.loginType === LoginType.wif) {
        password = data.password;
      }
      const message = JSON.stringify({ loginChallenge });
      const signer = getSigner(loginSignerOptions);
      const signature = await signer.signChallenge({
        message,
        password,
        translateFn: (v: string) => v
      });
      signatures[keyType] = signature;
    } catch (error) {
      logger.error(error, 'onSubmit error in signLoginChallenge');
      setErrorMsg('Login failed');
      return;
    }

    const body: PostLoginSchema = {
      username,
      loginType,
      hivesignerToken,
      keyType,
      txJSON: '""',
      pack: TTransactionPackType.HF_26,
      strict,
      signatures,
      authenticateOnBackend
    };

    try {
      await signIn.mutateAsync({ data: body });
    } catch (error) {
      logger.error(error, 'onSubmit unexpected error');
      setErrorMsg('Login failed');
    }
  };

  return <LoginForm errorMessage={errorMsg} onSubmit={onSubmit} />;
}
