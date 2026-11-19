import { useState, useRef, MutableRefObject } from 'react';
import { isUserCancelled } from '@ui/lib/user-cancelled';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { useSignIn } from '@smart-signer/lib/auth/use-sign-in';
import { fetchLoginChallenge } from '@smart-signer/lib/auth/login-challenge';
import { Signatures, PostLoginSchema } from '@smart-signer/lib/auth/utils';
import type { SignerOptions } from '@smart-signer/lib/signer/signer';
import { useSigner } from '@smart-signer/lib/use-signer';
import type { operation } from '@hiveio/wax';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

/** The signers and the wax chain, loaded on the first sign-in: the form shows before they are needed */
async function loadSigningStack() {
  const [{ getSigner }, { getOperationForLogin }, { getChain }] = await Promise.all([
    import('@smart-signer/lib/signer/get-signer'),
    import('@smart-signer/lib/login-operation'),
    import('@transaction/lib/chain')
  ]);
  return { getSigner, getOperationForLogin, hiveChain: await getChain() };
}

export interface LoginFormSchema {
  username: string;
  loginType: LoginType;
  remember: boolean;
  keyType: KeyType;
}

export const useProcessAuth = (authenticateOnBackend: boolean) => {
  const authDataRef = useRef<PostLoginSchema | null>(null) as MutableRefObject<PostLoginSchema | null>;
  const [isSigned, setIsSigned] = useState(false);
  const { signerOptions } = useSigner();
  const signIn = useSignIn();

  const signAuth = async (data: LoginFormSchema): Promise<void> => {
    logger.debug('onSubmit form data: %o', data);
    const { loginType, username, keyType } = data;
    const signatures: Signatures = { posting: '', active: '' };
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
      if (loginType === LoginType.hiveauth) {
        const { signInWithHiveAuth } = await import('@smart-signer/lib/hiveauth/sign-in');
        signInData = await signInWithHiveAuth(loginSignerOptions, authenticateOnBackend);
      } else {
        const [{ getSigner, getOperationForLogin, hiveChain }, challenge] = await Promise.all([
          loadSigningStack(),
          fetchLoginChallenge()
        ]);
        const operation: operation = await getOperationForLogin(username, keyType, challenge, loginType);

        const expr = new Date();
        expr.setHours(expr.getHours() + 1);
        const txBuilder = await hiveChain.createTransaction(expr);
        txBuilder.pushOperation(operation);
        txBuilder.validate();
        const tx = txBuilder.transaction;

        const signer = getSigner(loginSignerOptions);
        const pack = signer.pack;
        const signature = await signer.signTransaction({
          digest: txBuilder.sigDigest,
          transaction: tx
        });

        logger.debug('signature: %s', signature);
        txBuilder.addSignature(signature);
        signatures[keyType] = signature;

        logger.debug('transaction: %o', {
          pack,
          toApi: txBuilder.toApi(),
          toApiParsed: JSON.parse(txBuilder.toApi())
        });

        signInData = {
          username,
          loginType,
          keyType,
          txJSON: txBuilder.toApi(),
          pack,
          signatures,
          authenticateOnBackend
        };
      }
    } catch (error) {
      // The caller logs a cancel once; only a real failure gets its stack here
      if (!isUserCancelled(error)) logger.error(error, 'onSubmit error in signLoginChallenge');
      return Promise.reject(error);
    }

    authDataRef.current = signInData;

    setIsSigned(true);
    return Promise.resolve();
  };

  const submitAuth = async () => {
    try {
      if (authDataRef.current) {
        // TODO:
        await signIn.mutateAsync({ data: authDataRef.current });
      } else {
        throw new Error('Unexpected error while processing authorization');
      }
    } catch (error: unknown) {
      logger.error(error, 'onSubmit unexpected error');
      throw error;
    } finally {
      authDataRef.current = null;
      setIsSigned(false);
    }
  };

  return {
    signAuth,
    submitAuth,
    isSigned
  };
};
