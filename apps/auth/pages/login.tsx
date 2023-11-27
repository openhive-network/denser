import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from 'next-i18next.config';
import { useState } from 'react'
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { withIronSessionSsr } from "iron-session/next";
import secureRandom from 'secure-random';
import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { KeychainKeyTypes, KeychainKeyTypesLC } from 'hive-keychain-commons';
import { LoginForm, LoginFormSchema } from "@/auth/components/login-form";
import { useUser } from '@/auth/lib/use-user';
import { fetchJson, FetchError } from '@/auth/lib/fetch-json';
import { getLogger } from "@hive/ui/lib/logging";
import { sessionOptions } from '@/auth/lib/session';
import { Signatures, PostLoginSchema, LoginTypes } from '@/auth/pages/api/login';
import HiveAuthUtils from '@/auth/lib/hive-auth-utils';
import { useLocalStorage } from '@/auth/lib/use-local-storage';

const logger = getLogger('app');

export default function LoginPage({
  loginChallenge
}: InferGetServerSidePropsType<typeof getServerSideProps>) {

  const { t } = useTranslation('common_auth');

  // Here we just check if user is already logged in and we redirect him
  // to profile page, if he is.
  const { mutateUser } = useUser({
    redirectTo: '/profile',
    redirectIfFound: true,
  });

  const [errorMsg, setErrorMsg] = useState('');

  const [hiveAuthData, setHiveAuthData] =
      useLocalStorage('hiveAuthData', HiveAuthUtils.initialHiveAuthData);

  const [hiveKeys, setHiveKeys] =
      useLocalStorage('hiveKeys', {});

  // Create a signature of message (login challenge) for sending to
  // back-end for verification.
  const signLoginChallenge = async (
        loginType: LoginTypes,
        username: string,
        password: string, // posting private key
        keyType: KeychainKeyTypesLC = KeychainKeyTypesLC.posting,
      ): Promise<Signatures> => {
    logger.info('in signLoginChallenge %o',
        {loginType, username, loginChallenge});
    const signatures: Signatures = {};
    const challenge = { token: loginChallenge };
    const message = JSON.stringify(challenge, null, 0);

    if (loginType === LoginTypes.keychain) {
      try {
        const response: any = await new Promise((resolve) => {
          window.hive_keychain.requestSignBuffer(
            username,
            message,
            KeychainKeyTypes[keyType],
            (res: any) => {
              resolve(res);
            }
          );
        });
        if (response.success) {
          logger.info('keychain', {signature: response.result});
          signatures.posting = response.result;
        } else {
          throw new Error(response.error);
        }
      } catch (error) {
        throw error;
      }
    } else if (loginType === LoginTypes.hiveauth) {

      logger.info('hiveauth');

      HiveAuthUtils.setUsername(hiveAuthData?.username || '');
      HiveAuthUtils.setToken(hiveAuthData?.token || '');
      HiveAuthUtils.setExpire(hiveAuthData?.expire || 0);
      HiveAuthUtils.setKey(hiveAuthData?.key || '')

      const authResponse: any = await new Promise((resolve) => {
        HiveAuthUtils.login(username, message, (res) => {
          resolve(res);
        }, t);
      });

      if (authResponse.success && authResponse.hiveAuthData) {
        const {
          token, expire, key, challengeHex,
        } = authResponse.hiveAuthData;
        setHiveAuthData({username, token, expire, key});
        logger.info('hiveauth', {signature: challengeHex});
        signatures.posting = challengeHex;
      } else {
        throw new Error('Hiveauth login failed');
      }

    } else if (loginType === LoginTypes.password) {
      try {
        const privateKey = PrivateKey.fromString(password);
        const messageHash = cryptoUtils.sha256(message);
        const signature = privateKey.sign(messageHash).toString();
        logger.info('password', {signature});
        signatures.posting = signature;
        setHiveKeys({...hiveKeys, ...{posting: password}})
    } catch (error) {
        throw error;
      }
    }

    return signatures;

  }

  const onSubmit = async (data: LoginFormSchema) => {
    logger.info('onSubmit form data', data);
    setErrorMsg('');

    const { loginType, username } = data;
    let password = '';
    if (data.loginType === LoginTypes.password) {
      password = data.password;
    }
    let signatures: Signatures = {};
    let hivesignerToken = '';

    try {
      signatures =
          await signLoginChallenge(loginType, username, password || '');
    } catch (error) {
      logger.error('onSubmit error in signLoginChallenge', error);
      setErrorMsg(t('pageLogin.signingFailed'));
      return;
    }

    logger.info({signatures});

    const body: PostLoginSchema = {
      username,
      signatures,
      loginType,
      hivesignerToken,
    };

    try {
      mutateUser(
        await fetchJson('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      )
    } catch (error) {
      if (error instanceof FetchError) {
        logger.error('onSubmit FetchError', error);
        // setErrorMsg(error.data.error?.message
        //     || t('pageLogin.loginFailed'));
      } else {
        logger.error('onSubmit unexpected error', error);
      }
      setErrorMsg(t('pageLogin.loginFailed'));
    }
  };

  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2
        sm:gap-0 sm:justify-around">
      <div className="flex flex-col gap-3 sm:gap-8 sm:mr-4">
        <LoginForm
          errorMessage={errorMsg}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = withIronSessionSsr(
  async function getServerSideProps({ req }) {
    let loginChallenge = req.session.loginChallenge;
    if (!loginChallenge) {
      loginChallenge = secureRandom.randomBuffer(16).toString('hex');
      req.session.loginChallenge = loginChallenge;
      await req.session.save();
    }
    return {
      props: {
        loginChallenge,
        ...(await serverSideTranslations(
          req.cookies.NEXT_LOCALE! || i18n.defaultLocale,
          ['common_auth'])),
      },
    };
  },
  sessionOptions
);
