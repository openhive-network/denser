import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { LoginType } from '@smart-signer/types/common';
import { parseCookie } from '@smart-signer/lib/utils';
import { Signatures, PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { useSignIn } from '@smart-signer/lib/auth/use-sign-in';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { LoginForm, LoginFormSchema } from '@smart-signer/components/signin-form';
import { cookieNamePrefix } from '@smart-signer/lib/session';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { KeyType } from '@smart-signer/types/common';
import { useSigner } from '@smart-signer/lib/use-signer';
import { transactionService } from '@transaction/index';
import { hiveChainService } from '@transaction/lib/hive-chain-service'
import {
  createHiveChain,
  IHiveChainInterface,
  transaction,
  ApiTransaction,
  ApiAuthority,
  TAccountName,
  TWaxExtended,
  ApiKeyAuth,
  operation,
  vote,
  transfer,
  ApiOperation,
  transaction as waxTranaction
} from '@hive/wax'
import { authorityChecker, AuthorityLevel } from '@smart-signer/lib/authority-checker';


import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

export function LoginPanel({ i18nNamespace = 'smart-signer' }: { i18nNamespace?: string }) {
  const router = useRouter();
  const slug = router.query.slug as string;
  const { t } = useTranslation(i18nNamespace);
  const [loginChallenge, setLoginChallenge] = useState('');
  const { signerOptions } = useSigner();
  const [errorMsg, setErrorMsg] = useState('');
  const signIn = useSignIn();

  useEffect(() => {
    const cookieStore = parseCookie(document.cookie);
    setLoginChallenge(cookieStore[`${cookieNamePrefix}login_challenge`] || '');
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
    const { loginType, username } = data;
    let signatures: Signatures = {};
    let hivesignerToken = '';
    let authorityLevel: AuthorityLevel;

    // TODO The value for keyType will be passed from form in new UI.
    // const keyType: KeyType = KeyType.posting;
    // TODO login with active key does not work.
    const keyType: KeyType = KeyType.active;

    let operation: operation;
    if (keyType === KeyType.posting) {
      authorityLevel = AuthorityLevel.POSTING;
      operation = {
        vote: {
          voter: username,
          author: "author",
          permlink: loginChallenge,
          weight: 10000,
        }
      };
    } else if (keyType === KeyType.active) {
      authorityLevel = AuthorityLevel.ACTIVE;
      operation = {
        transfer: {
          from_account: username,
          to_account: username,
          amount: {
            amount: "1",
            precision: 3,
            nai: "@@000000021"
          },
          memo: loginChallenge,
        }
      };
    } else {
      throw new Error('Unsupported keyType');
    }

    try {
      const hiveChain = await hiveChainService.getHiveChain();
      const txBuilder = await hiveChain.getTransactionBuilder();
      txBuilder.push(operation);
      txBuilder.validate();
      const tx = txBuilder.build();

      const loginSignerOptions: SignerOptions = {
        ...signerOptions,
        ...{
          username,
          loginType,
          keyType
        }
      };
      const signer = getSigner(loginSignerOptions);

      let returnSignedTransaction = false;
      if (loginType = LoginType.keychain) {
        returnSignedTransaction = true;
      }

      const signedTransactionOrSignature = await signer.signTransaction({
        digest: txBuilder.sigDigest,
        transaction: tx,
        returnSignedTransaction,
      });

      logger.info('signedTransactionOrSignature: %o', signedTransactionOrSignature);
      txBuilder.build(signedTransactionOrSignature);
      txBuilder.validate();

      // This loop is required for Keychain, because there're not any
      // signatures in txBuilder now. Bug in txBuilder?
      if (loginType = LoginType.keychain) {
        for (const s of signedTransactionOrSignature.signatures) {
          txBuilder.build(s);
        }
        txBuilder.validate();
      }

      logger.info('transaction: %o', {
        toApi: txBuilder.toApi(),
        toString: txBuilder.toString(),
        parsedToApi: JSON.parse(txBuilder.toApi()),
        parsedToString: JSON.parse(txBuilder.toString()),
      });

      // FIXME temporary solution. The logic that verifies user's
      // signature will be moved to server.
      await authorityChecker(
        JSON.parse(txBuilder.toApi()) as ApiTransaction,
        username,
        authorityLevel
        );

      signatures[keyType] = signature;

      throw new Error('Fake Error');

    } catch (error) {
      logger.error('onSubmit error in signLoginChallenge', error);
      setErrorMsg(t('pageLogin.signingFailed'));
      return;
    }

    // TODO in new implementation this request will change.
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
