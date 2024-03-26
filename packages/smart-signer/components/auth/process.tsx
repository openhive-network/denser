import { useState, useEffect, useRef, MutableRefObject, useMemo } from "react";
import { useRouter } from "next/router";
import { TFunction } from 'next-i18next';
import { cookieNamePrefix } from "@smart-signer/lib/session";
import { parseCookie } from "@smart-signer/lib/utils";
import { KeyType } from "@smart-signer/types/common";
import { useSignIn } from "@smart-signer/lib/auth/use-sign-in";
import { logger } from "@hive/ui/lib/logger";
import { Signatures, PostLoginSchema } from "@smart-signer/lib/auth/utils";
import { getSigner } from "@smart-signer/lib/signer/get-signer";
import { SignerOptions } from "@smart-signer/lib/signer/signer";
import { LoginFormSchema as SignInFormSchema } from "../signin-form";

export interface LoginFormSchema extends SignInFormSchema {
  keyType: KeyType;
}

export const useProcessAuth = (t: TFunction) => {
  const router = useRouter();
  const slug = router.query.slug as string;
  const authDataRef = useRef<PostLoginSchema | null>(null) as MutableRefObject<PostLoginSchema | null>
  const [loginChallenge, setLoginChallenge] = useState('');
  const [isSigned, setIsSigned] = useState(false);

  useEffect(() => {
    const cookieStore = parseCookie(document.cookie);
    setLoginChallenge(cookieStore[`${cookieNamePrefix}login_challenge`] || '');
  }, []);

  const [errorMsg, setErrorMsg] = useState('');

  const signIn = useSignIn();

  const signAuth = async (data: LoginFormSchema): Promise<void> => {
    logger.info('onSubmit form data', data);
    setErrorMsg('');

    const message = JSON.stringify({ loginChallenge }, null, 0);

    const { loginType, username, keyType } = data;
    let signatures: Signatures = {};
    let hivesignerToken = '';

    const signerOptions: SignerOptions = {
      username,
      loginType,
      keyType: keyType,
      apiEndpoint: 'https://api.hive.blog',
      storageType: 'localStorage',
    };
    const signer = getSigner(signerOptions);

    try {
      const signature = await signer.signChallenge({
        message,
        password: '',
        translateFn: t
      });
      signatures[keyType] = signature;
    } catch (error) {
      logger.error('onSubmit error in signLoginChallenge', error);
      setErrorMsg(t('pageLogin.signingFailed'));
      return Promise.reject(error);
    }

    const body: PostLoginSchema = {
      username: username || '',
      signatures,
      loginType,
      hivesignerToken
    };

    authDataRef.current = body;
    setIsSigned(true);
    return Promise.resolve();
  }

  const submitAuth = async () => {
    try {
      if (authDataRef.current) {
        await signIn.mutateAsync({ data: authDataRef.current, uid: slug });
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