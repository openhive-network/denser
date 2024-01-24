import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { getLogger } from '@hive/ui/lib/logging';
import { LoginTypes } from '@smart-signer/types/common';
import { parseCookie } from '@smart-signer/lib/utils';
import { Signatures, PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { useLocalStorage } from '@smart-signer/lib/use-local-storage';
import { useSignIn } from '@smart-signer/lib/auth/use-sign-in';
import { useUser } from '@smart-signer/lib/auth/use-user';
import HiveAuthUtils from '@smart-signer/lib/hive-auth-utils';
import { LoginForm, LoginFormSchema } from '@smart-signer/components/login-form';
import { cookieNamePrefix } from '@smart-signer/lib/session';
import { Signer } from '@smart-signer/lib/signer';
import { KeychainKeyTypesLC } from 'hive-keychain-commons';

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
    redirectTo: '/profile',
    redirectIfFound: true
  });

  const [errorMsg, setErrorMsg] = useState('');

  const [hiveAuthData, setHiveAuthData] = useLocalStorage('hiveAuthData', HiveAuthUtils.initialHiveAuthData);

  const [hiveKeys, setHiveKeys] = useLocalStorage('hiveKeys', {});

  const signIn = useSignIn();

  const onSubmit = async (data: LoginFormSchema) => {
    logger.info('onSubmit form data', data);
    setErrorMsg('');

    const { loginType, username } = data;
    let password = '';
    if (data.loginType === LoginTypes.password) {
      password = data.password;
    } else if (data.loginType === LoginTypes.hbauth) {
      password = data.passwordHbauth;
    }
    let signatures: Signatures = {};
    let hivesignerToken = '';
    const signer = new Signer();
    const challenge = { token: loginChallenge };
    const message = JSON.stringify(challenge, null, 0);

    try {
      signatures = await signer.sign(
        message,
        loginType,
        username,
        password,
        KeychainKeyTypesLC.posting,
        hiveAuthData,
        setHiveAuthData,
        t,
        hiveKeys,
        setHiveKeys
        );
    } catch (error) {
      logger.error('onSubmit error in signLoginChallenge', error);
      setErrorMsg(t('pageLogin.signingFailed'));
      return;
    }

    logger.info({ signatures });

    const body: PostLoginSchema = {
      username: username || '',
      signatures,
      loginType,
      hivesignerToken
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
