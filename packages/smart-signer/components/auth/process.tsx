import { useState, useEffect, useRef, MutableRefObject, useMemo } from "react";
import { useRouter } from "next/router";
import { TFunction } from 'next-i18next';
import { cookieNamePrefix } from "@smart-signer/lib/session";
import { getCookie } from "@smart-signer/lib/utils";
import { KeyType } from "@smart-signer/types/common";
import { useSignIn } from "@smart-signer/lib/auth/use-sign-in";
import { Signatures, PostLoginSchema } from "@smart-signer/lib/auth/utils";
import { getSigner } from "@smart-signer/lib/signer/get-signer";
import { SignerOptions } from "@smart-signer/lib/signer/signer";
import { useSigner } from '@smart-signer/lib/use-signer';
import { LoginFormSchema as SignInFormSchema } from "../signin-form";
import { getOperationForLogin } from '@smart-signer/lib/login-operation';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { operation } from '@hiveio/wax';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');
export interface LoginFormSchema extends SignInFormSchema {
  keyType: KeyType;
}

export const useProcessAuth = (
  t: TFunction,
  authenticateOnBackend: boolean,
  strict: boolean
  ) => {
  const router = useRouter();
  const authDataRef = useRef<PostLoginSchema | null>(null) as MutableRefObject<PostLoginSchema | null>
  const [loginChallenge, setLoginChallenge] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const { signerOptions } = useSigner();
  const [errorMsg, setErrorMsg] = useState('');
  const signIn = useSignIn();

  useEffect(() => {
    setLoginChallenge(getCookie(`${cookieNamePrefix}login_challenge`));
  }, []);

  const signAuth = async (data: LoginFormSchema): Promise<void> => {
    logger.info('onSubmit form data', data);
    setErrorMsg('');

    const message = JSON.stringify({ loginChallenge }, null, 0);

    const { loginType, username, keyType } = data;
    const signatures: Signatures = { posting: '', active: '' };
    let hivesignerToken = '';
    let signInData: PostLoginSchema;

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
      const txBuilder = await hiveChain.createTransaction();
      txBuilder.pushOperation(operation);
      txBuilder.validate();
      const tx = txBuilder.transaction;

      const signer = getSigner(loginSignerOptions);
      const pack = signer.pack;
      const signature = await signer.signTransaction({
        digest: txBuilder.sigDigest,
        transaction: tx
      });
      logger.info('signature: %s', signature);
      txBuilder.sign(signature);
      signatures[keyType] = signature;

      logger.info('transaction: %o', {
        pack,
        toApi: txBuilder.toApi(),
        toApiParsed: JSON.parse(txBuilder.toApi()),
      });

      signInData = {
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
    } catch (error) {
      logger.error('onSubmit error in signLoginChallenge', error);
      setErrorMsg(t('pageLogin.signingFailed'));
      return Promise.reject(error);
    }

    authDataRef.current = signInData;
    setIsSigned(true);
    return Promise.resolve();
  }

  const submitAuth = async () => {
    try {
      if (authDataRef.current) {
        await signIn.mutateAsync({ data: authDataRef.current });
      } else {
        throw new Error('Unexpected error while processing authorization');
      }
    } catch (error) {
      logger.error('onSubmit unexpected error', error);
      setErrorMsg(t('pageLogin.loginFailed'));
      throw errorMsg;
    } finally {
      authDataRef.current = null;
      setIsSigned(false);
    }
  };

  return {
    signAuth,
    submitAuth,
    isSigned,
    errorMsg
  }
}