import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { KeychainKeyTypes, KeychainKeyTypesLC } from 'hive-keychain-commons';

import { getLogger } from "@hive/ui/lib/logging";

import { authService } from '@smart-signer/lib/auth-service';
import { LoginTypes } from "@smart-signer/types/common";
import { parseCookie } from '@smart-signer/lib/utils';
import { Signatures, PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { useLocalStorage } from '@smart-signer/lib/use-local-storage';
import { useSignIn } from '@smart-signer/lib/auth/use-sign-in';
import { useUser } from '@smart-signer/lib/auth/use-user';
import HiveAuthUtils from '@smart-signer/lib/hive-auth-utils';

import { LoginForm, LoginFormSchema } from "@/auth/components/login-form";

const logger = getLogger('app');

export function LoginPanel() {

  const router = useRouter();
  const slug = router.query.slug as string;

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
          keyType: KeychainKeyTypesLC = KeychainKeyTypesLC.posting,
          ) => {
        logger.info('sign args: %o', {username, password, message, keyType});

        const authClient = await authService.getOnlineClient();
        const auth = await authClient.getAuthByUser(username);
        logger.info('auth: %o', auth);

        if (!auth) {
          throw new Error(`No auth for username ${username}`);
        }

        if (!auth.authorized) {
          if (!['posting', 'active'].includes(keyType)) {
            throw new Error(`Unsupported keyType: ${keyType}`);
          }
          const authStatus = await authClient.authenticate(username,
              password, keyType as unknown as 'posting' | 'active');

          logger.info({authStatus});
          if (!authStatus.ok) {
            throw new Error(`Unlocking wallet failed`);
          }
        }

        const digest = cryptoUtils.sha256(message).toString('hex');
        if (!['posting', 'active'].includes(keyType)) {
          throw new Error(`Unsupported keyType: ${keyType}`);
        }
        const signature = await authClient.sign(
          username,
          digest,
          keyType as unknown as 'posting' | 'active'
          );
        logger.info({digest, signature});

        return signature;
      };

      const checkAuths = async (username: string, keyType: string) => {
        const authClient = await authService.getOnlineClient();
        const auths = await authClient.getAuths();
        logger.info('auths: %o', auths);
        const auth = auths.find((auth) => auth.username === username);
        if (auth) {
          logger.info('found auth: %o', auth);
          if (auth.authorized) {
            if (auth.keyType === keyType) {
              logger.info('user is authorized and we are ready to proceed');
              // We're ready to sign loginChallenge and proceed.
            } else {
              logger.info('user is authorized, but with incorrect keyType: %s', auth.keyType);
            }
          } else {
            logger.info('user is not authorized');
            // We should tell to unlock wallet (login to wallet).
          }
        } else {
          logger.info('auth for user not found: %s', username);
          // We should offer adding account to wallet.
        }
      };

      try {
        // await checkAuths(username, 'posting');
        signatures.posting = await sign(username, password, message, keyType);
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
          await signLoginChallenge(loginType, username || '', password || '');
    } catch (error) {
      logger.error('onSubmit error in signLoginChallenge', error);
      setErrorMsg(t('pageLogin.signingFailed'));
      return;
    }

    logger.info({signatures});

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

  return (
    <LoginForm
        errorMessage={errorMsg}
        onSubmit={onSubmit}
    />
  );
}
