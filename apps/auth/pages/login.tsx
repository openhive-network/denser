import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from 'next-i18next.config';
import { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next';
import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { KeychainKeyTypes, KeychainKeyTypesLC } from 'hive-keychain-commons';
import { LoginForm, LoginFormSchema } from "@/auth/components/login-form";
import { useUser } from '@/auth/lib/auth/use-user';
import { useSignIn } from '@/auth/lib/auth/use-sign-in';
import { getLogger } from "@hive/ui/lib/logging";
import { Signatures, PostLoginSchema, LoginTypes } from '@/auth/pages/api/login';
import HiveAuthUtils from '@/auth/lib/hive-auth-utils';
import { useLocalStorage } from '@/auth/lib/use-local-storage';
import { parseCookie } from '@/auth/lib/utils';
import { authService } from '@/auth/lib/auth-service';

const logger = getLogger('app');

export default function LoginPage() {

  const { t } = useTranslation('common_auth');

  const [loginChallenge, setLoginChallenge] = useState('');

  useEffect(() => {
    const cookieStore = parseCookie(document.cookie);
    setLoginChallenge(cookieStore.loginChallenge || '');
  }, []);

  // Here we just check if user is already logged in and we redirect him
  // to profile page, if he is.
  const { user } = useUser({
    redirectTo: '/profile',
    redirectIfFound: true,
  });

  const [errorMsg, setErrorMsg] = useState('');

  const [hiveAuthData, setHiveAuthData] =
      useLocalStorage('hiveAuthData', HiveAuthUtils.initialHiveAuthData);

  const [hiveKeys, setHiveKeys] =
      useLocalStorage('hiveKeys', {});

  // Create a signature of message (json with loginChallenge string) for
  // sending to back-end for verification.
  const signLoginChallenge = async (
        loginType: LoginTypes,
        username: string,
        password: string, // posting private key
        keyType: KeychainKeyTypesLC = KeychainKeyTypesLC.posting,
      ): Promise<Signatures> => {
    logger.info('in signLoginChallenge %o',
        {loginType, username, loginChallenge, password});
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

    } else if (loginType === LoginTypes.hbauth) {

      const sign = async (
          username: string,
          password: string,
          message: string,
          keyType: 'posting' | 'active' = 'posting',
          ) => {
        logger.info('sign args: %o', {username, password, message, keyType});

        const authClient = await authService.getOnlineClient();
        const auth = await authClient.getAuthByUser(username);
        logger.info({auth});

        if (!auth) {
          throw new Error(`No auth for username ${username}`);
        }

        if (!auth.authorized) {
          const authStatus = await authClient.authenticate(username, password, keyType);
          logger.info({authStatus});
          if (!authStatus.ok) {
            throw new Error(`Unlocking wallet failed`);
          }
        }

        const digest = cryptoUtils.sha256(message).toString('hex');
        const signature = await authClient.sign(
          username,
          digest,
          keyType
          );
        logger.info({digest, signature});

        return signature;
      };

      const checkAuths = async (username: string) => {
        const authClient = await authService.getOnlineClient();
        const auths = await authClient.getAuths();
        logger.info({auths});
        const user = auths.find((user) => user.username === username);
        if (user) {
          logger.info('found user: %o', user);
          if (user.authorized) {
            logger.info('user is authorized');
            // We're ready to sign loginChallenge and proceed.
          } else {
            logger.info('user is not authorized');
            // We should tell to unlock wallet (login to wallet).
          }
        } else {
          logger.info('user not found: %s', username);
          // We should offer adding account to wallet.
        }
      };

      try {
        signatures.posting = await sign(username, password, message, keyType);
        await checkAuths(username);
      } catch (e) {
        logger.error('Caught error');
        logger.error(e);
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
      await signIn.mutateAsync(body)
    } catch (error) {
      logger.error('onSubmit unexpected error', error);
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

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return {
    props: {
      ...(await serverSideTranslations(req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_auth']))
    }
  };
};
