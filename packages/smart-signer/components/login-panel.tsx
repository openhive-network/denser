import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { LoginTypes } from '@smart-signer/types/common';
import { parseCookie } from '@smart-signer/lib/utils';
import { Signatures, PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { useSignIn } from '@smart-signer/lib/auth/use-sign-in';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { LoginForm, LoginFormSchema } from '@smart-signer/components/login-form';
import { cookieNamePrefix } from '@smart-signer/lib/session';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { KeyTypes } from '@smart-signer/types/common';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export function LoginPanel({ i18nNamespace = 'smart-signer' }: { i18nNamespace?: string }) {
  const router = useRouter();
  const slug = router.query.slug as string;

  const { t } = useTranslation(i18nNamespace);

  const [loginChallenge, setLoginChallenge] = useState('');

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

  const [errorMsg, setErrorMsg] = useState('');

  const signIn = useSignIn();

  const onSubmit = async (data: LoginFormSchema) => {
    logger.info('onSubmit form data', data);
    setErrorMsg('');

    const { loginType, username } = data;
    let password = '';
    if (data.loginType === LoginTypes.wif) {
      password = data.password;
    }
    let signatures: Signatures = {};
    let hivesignerToken = '';
    const signerOptions: SignerOptions = {
      username,
      loginType,
      keyType: KeyTypes.posting,
      apiEndpoint: 'https://api.hive.blog',
      storageType: 'localStorage',
    };
    const signer = getSigner(signerOptions);
    const message = JSON.stringify({ loginChallenge }, null, 0);

    try {
      const keyType = KeyTypes.posting;
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
      username: username || '',
      signatures,
      loginType,
      hivesignerToken,
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
