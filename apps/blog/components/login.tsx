import { useTranslation } from 'next-i18next';
import { useState, useEffect, ReactNode } from 'react';
import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { KeychainKeyTypes, KeychainKeyTypesLC } from 'hive-keychain-commons';
import { getLogger } from '@hive/ui/lib/logging';
import { parseCookie } from '@/blog/lib/utils';
import { useLocalStorage } from './hooks/use-local-storage';
import HiveAuthUtils from '@/blog/lib/hive-auth-utils';
import { Signatures, PostLoginSchema, LoginTypes } from '@/blog/pages/api/login';
import { useSignIn } from './hooks/use-sign-in';
import { LoginFormSchema, LoginForm } from './login-form';
import { Dialog, DialogContent, DialogTrigger } from '@hive/ui/components/dialog';

const logger = getLogger('app');

export default function Login({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common_auth');

  const [loginChallenge, setLoginChallenge] = useState('');

  useEffect(() => {
    const cookieStore = parseCookie(document.cookie);
    setLoginChallenge(cookieStore.loginChallenge || '');
  }, []);

  const [errorMsg, setErrorMsg] = useState('');

  const [hiveAuthData, setHiveAuthData] = useLocalStorage('hiveAuthData', HiveAuthUtils.initialHiveAuthData);

  const [hiveKeys, setHiveKeys] = useLocalStorage('hiveKeys', {});

  // Create a signature of message (json with loginChallenge string) for
  // sending to back-end for verification.
  const signLoginChallenge = async (
    loginType: LoginTypes,
    username: string,
    password: string, // posting private key
    keyType: KeychainKeyTypesLC = KeychainKeyTypesLC.posting
  ): Promise<Signatures> => {
    logger.info('in signLoginChallenge %o', { loginType, username, loginChallenge });
    const signatures: Signatures = {};
    const challenge = { token: loginChallenge };
    const message = JSON.stringify(challenge, null, 0);

    if (loginType === LoginTypes.keychain) {
      try {
        const response: any = await new Promise((resolve) => {
          window.hive_keychain.requestSignBuffer(username, message, KeychainKeyTypes[keyType], (res: any) => {
            resolve(res);
          });
        });
        if (response.success) {
          logger.info('keychain', { signature: response.result });
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
        const { token, expire, key, challengeHex } = authResponse.hiveAuthData;
        setHiveAuthData({ username, token, expire, key });
        logger.info('hiveauth', { signature: challengeHex });
        signatures.posting = challengeHex;
      } else {
        throw new Error('Hiveauth login failed');
      }
    } else if (loginType === LoginTypes.password) {
      try {
        const privateKey = PrivateKey.fromString(password);
        const messageHash = cryptoUtils.sha256(message);
        const signature = privateKey.sign(messageHash).toString();
        logger.info('password', { signature });
        signatures.posting = signature;
        setHiveKeys({ ...hiveKeys, ...{ posting: password } });
      } catch (error) {
        throw error;
      }
    }

    return signatures;
  };

  const signIn = useSignIn();

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
      signatures = await signLoginChallenge(loginType, username, password || '');
    } catch (error) {
      logger.error('onSubmit error in signLoginChallenge', error);
      setErrorMsg(t('pageLogin.signingFailed'));
      return;
    }

    logger.info({ signatures });

    const body: PostLoginSchema = {
      username,
      signatures,
      loginType,
      hivesignerToken
    };

    try {
      await signIn.mutateAsync(body);
    } catch (error) {
      logger.error('onSubmit unexpected error', error);
      setErrorMsg(t('pageLogin.loginFailed'));
    }
  };

  return (
    // <div
    //   className="mx-2 flex flex-col gap-24 pt-16 sm:flex-row
    //     sm:justify-around sm:gap-0"
    // >
    //   <div className="flex flex-col gap-3 sm:mr-4 sm:gap-8">
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]" data-testid="login-dialog">
        <LoginForm errorMessage={errorMsg} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
    //   </div>
    // </div>
  );
}
