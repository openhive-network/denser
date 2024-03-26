import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { TFunction } from 'next-i18next';
import { cookieNamePrefix } from "@smart-signer/lib/session";
import { parseCookie } from "@smart-signer/lib/utils";
import { KeyType, LoginType } from "@smart-signer/types/common";
import { useSignIn } from "@smart-signer/lib/auth/use-sign-in";
import { logger } from "@hive/ui/lib/logger";
import { Signatures, PostLoginSchema } from "@smart-signer/lib/auth/utils";
import { getSigner } from "@smart-signer/lib/signer/get-signer";
import { SignerOptions } from "@smart-signer/lib/signer/signer";
import { LoginFormSchema } from "../signin-form";

export const useProcessAuth = (t: TFunction) => {
    const router = useRouter();
    const slug = router.query.slug as string;

    const [loginChallenge, setLoginChallenge] = useState('');

    useEffect(() => {
        const cookieStore = parseCookie(document.cookie);
        setLoginChallenge(cookieStore[`${cookieNamePrefix}login_challenge`] || '');
    }, []);

    const [errorMsg, setErrorMsg] = useState('');

    const signIn = useSignIn();

    const onSubmit = async (data: LoginFormSchema) => {
        logger.info('onSubmit form data', data);
        setErrorMsg('');
    
        const message = JSON.stringify({ loginChallenge }, null, 0);
    
        const { loginType, username } = data;
        let signatures: Signatures = {};
        let hivesignerToken = '';
    
        const signerOptions: SignerOptions = {
          username,
          loginType,
          keyType: KeyType.posting,
          apiEndpoint: 'https://api.hive.blog',
          storageType: 'localStorage',
        };
        const signer = getSigner(signerOptions);
    
        try {
          const keyType = KeyType.posting;
          const signature = await signer.signChallenge({
            message,
            password: '',
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
          hivesignerToken
        };
    
        try {
          await signIn.mutateAsync({ data: body, uid: slug });
        } catch (error) {
          logger.error('onSubmit unexpected error', error);
          setErrorMsg(t('pageLogin.loginFailed'));
        }
      };

      return {
        onSubmit,
        errorMsg
      }
}