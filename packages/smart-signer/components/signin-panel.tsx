import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { LoginType } from '@smart-signer/types/common';
import { getCookie } from '@smart-signer/lib/utils';
import { Signatures, PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { useSignIn } from '@smart-signer/lib/auth/use-sign-in';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { LoginFormSchema } from '@smart-signer/components/signin-form';
import { cookieNamePrefix } from '@smart-signer/lib/session';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { useSigner } from '@smart-signer/lib/use-signer';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { operation } from '@hive/wax';
import dynamic from 'next/dynamic';
import { getOperationForLogin } from '@smart-signer/lib/login-operation';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

const DynamicLoginForm = dynamic(
  () => import('@smart-signer/components/signin-form'), {ssr: false});

interface LoginPanelOptions {
  authenticateOnBackend: boolean,
  strict: boolean; // if true use strict authentication
  i18nNamespace?: string
  enabledLoginTypes?: LoginType[];
}

export function LoginPanel(
  {
    authenticateOnBackend,
    strict,
    i18nNamespace = 'smart-signer',
    enabledLoginTypes = [
      LoginType.hbauth,
      LoginType.keychain,
      LoginType.wif,
    ]
  }: LoginPanelOptions
) {
  const router = useRouter();
  const slug = router.query.slug as string;
  const { t } = useTranslation(i18nNamespace);
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
      const hiveChain = await hiveChainService.getHiveChain();
      const operation: operation =
        await getOperationForLogin(username, keyType, loginChallenge);
      const txBuilder = await hiveChain.getTransactionBuilder();
      txBuilder.push(operation);
      txBuilder.validate();
      const tx = txBuilder.build();

      const signer = getSigner(loginSignerOptions);
      const pack = signer.pack;
      const signature = await signer.signTransaction({
        digest: txBuilder.sigDigest,
        transaction: tx
      });
      logger.info('signature: %s', signature);
      txBuilder.build(signature);
      signatures[keyType] = signature;

      logger.info('transaction: %o', {
        pack,
        toApi: txBuilder.toApi(),
        toApiParsed: JSON.parse(txBuilder.toApi()),
      });

      const signInData: PostLoginSchema = {
        username,
        loginType,
        hivesignerToken,
        keyType,
        txJSON: txBuilder.toApi(),
        pack,
        strict,
        signatures,
        authenticateOnBackend,
      };
      await signIn.mutateAsync({ data: signInData, uid: slug });
    } catch (error) {
      logger.error('onSubmit error in signLoginChallenge', error);
      setErrorMsg(t('pageLogin.loginFailed'));
      return;
    }
  };

  return <DynamicLoginForm
    errorMessage={errorMsg}
    onSubmit={onSubmit}
    enabledLoginTypes={enabledLoginTypes}
  />;
}
