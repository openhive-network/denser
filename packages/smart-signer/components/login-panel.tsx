import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
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
import { KeyTypes } from '@smart-signer/types/common';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export function LoginPanel(
    { i18nNamespace = 'smart-signer' }: { i18nNamespace?: string }
    ) {
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

  const [hiveAuthData, setHiveAuthData] =
    useLocalStorage('hiveAuthData', HiveAuthUtils.initialHiveAuthData);

  const [hiveKeys, setHiveKeys] = useLocalStorage('hiveKeys', {});

  const signIn = useSignIn();

  const onSubmit = async (data: LoginFormSchema) => {
    logger.info('onSubmit form data', data);
    setErrorMsg('');

    const { loginType, username } = data;
    let password = '';
    if (data.loginType === LoginTypes.wif) {
      password = data.password;
    } else if (data.loginType === LoginTypes.hbauth) {
      password = data.passwordHbauth;
    }
    let signatures: Signatures = {};
    let hivesignerToken = '';
    const signer = new Signer();
    const message = JSON.stringify({ loginChallenge }, null, 0);

    if (loginType === LoginTypes.hiveauth) {

      //
      // TODO Move logic from this code block to Signer.
      //

      try {
        HiveAuthUtils.setUsername(hiveAuthData?.username || '');
        HiveAuthUtils.setToken(hiveAuthData?.token || '');
        HiveAuthUtils.setExpire(hiveAuthData?.expire || 0);
        HiveAuthUtils.setKey(hiveAuthData?.key || '');

        const authResponse: any = await new Promise((resolve) => {
          HiveAuthUtils.login(
            username,
            message,
            (res) => {
              resolve(res);
            },
            t
          );
        });

        if (authResponse.success && authResponse.hiveAuthData) {
          const { token, expire, key, challengeHex } =
              authResponse.hiveAuthData;
          setHiveAuthData({ username, token, expire, key });
          logger.info('hiveauth', { signature: challengeHex });
          signatures.posting = challengeHex;
        } else {
          throw new Error('Hiveauth login failed');
        }
      } catch (error) {
        logger.error('onSubmit error in signing loginChallenge', error);
        setErrorMsg(t('pageLogin.signingFailed'));
        return;
      }
    } else {
      try {
        logger.info('bamboo KeyTypes.posting', KeyTypes.posting);
        signatures = await signer.signChallenge({
          message,
          loginType,
          username,
          password,
          keyType: KeyTypes.posting
        });

        // TODO This should be done in Signer.
        if (loginType === LoginTypes.wif) {
          setHiveKeys({ ...hiveKeys, ...{ posting: password } });
        }
      } catch (error) {
        logger.error('onSubmit error in signLoginChallenge', error);
        setErrorMsg(t('pageLogin.signingFailed'));
        return;
      }
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
