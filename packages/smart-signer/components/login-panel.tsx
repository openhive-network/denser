import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { LoginType } from '@smart-signer/types/common';
import { parseCookie } from '@smart-signer/lib/utils';
import { Signatures, PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { useSignIn } from '@smart-signer/lib/auth/use-sign-in';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { LoginForm, LoginFormSchema } from '@smart-signer/components/login-form';
import { cookieNamePrefix } from '@smart-signer/lib/session';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { KeyType } from '@smart-signer/types/common';
import { useSigner } from '@smart-signer/lib/use-signer';
import { TTransactionPackType } from '@hive/wax';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

export function LoginPanel(
  {
    authenticateOnBackend,
    strict,
    i18nNamespace = 'smart-signer'
  }: {
    authenticateOnBackend: boolean,
    strict: boolean; // if true use strict authentication
    i18nNamespace?: string
  }
) {
  const router = useRouter();
  const slug = router.query.slug as string;
  const { t } = useTranslation(i18nNamespace);
  const [loginChallenge, setLoginChallenge] = useState('');
  const { signerOptions } = useSigner();
  const [errorMsg, setErrorMsg] = useState('');
  const signIn = useSignIn();

  useEffect(() => {
    const cookieStore = parseCookie(document.cookie);
    setLoginChallenge(cookieStore[`${cookieNamePrefix}login_challenge`] || '');
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
    const signatures: Signatures = {posting: '', active: ''};
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
      const message = JSON.stringify({ loginChallenge }, null, 0);
      const signer = getSigner(loginSignerOptions);
      const signature = await signer.signChallenge({
        message,
        password,
        translateFn: t
      });
      signatures[keyType] = signature;
    } catch (error) {
      logger.error('onSubmit error in signLoginChallenge', error);
      setErrorMsg(t('pageLogin.signingFailed'));
      return;
    }

    const body: PostLoginSchema = {
      authenticateOnBackend,
      username,
      signatures,
      loginType,
      hivesignerToken,
      keyType,
      strict,
      pack: TTransactionPackType.HF_26,
      txJSON: '',
    };

    try {
      await signIn.mutateAsync({ data: body, uid: slug });
    } catch (error) {
      logger.error('onSubmit unexpected error', error);
      setErrorMsg(t('pageLogin.loginFailed'));
    }
  };

  return <LoginForm errorMessage={errorMsg} onSubmit={onSubmit} />;
}
