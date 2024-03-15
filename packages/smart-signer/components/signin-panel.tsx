import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { LoginType } from '@smart-signer/types/common';
import { parseCookie } from '@smart-signer/lib/utils';
import { Signatures, PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { useSignIn } from '@smart-signer/lib/auth/use-sign-in';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { LoginFormSchema } from '@smart-signer/components/signin-form';
import { cookieNamePrefix } from '@smart-signer/lib/session';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { KeyType } from '@smart-signer/types/common';
import { useSigner } from '@smart-signer/lib/use-signer';
import { transactionService } from '@transaction/index';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
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
  TTransactionPackType
} from '@hive/wax';
import { authorityChecker, AuthorityLevel } from '@smart-signer/lib/authority-checker';
import Loading from '@hive/ui/components/loading';
import dynamic from 'next/dynamic';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

const DynamicLoginForm = dynamic(() => import('@smart-signer/components/signin-form'), {
  // loading: () => <Loading loading={true} />,
  ssr: false
});

export function LoginPanel(
  {
    strict = false,
    i18nNamespace = 'smart-signer'
  }: {
    strict: boolean; // if true use strict authentication
    i18nNamespace?: string
  }
  ) {
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

    try {
      const { loginType, username, keyType } = data;
      let signatures: Signatures = {};
      let hivesignerToken = '';

      const hiveChain = await hiveChainService.getHiveChain();

      let authorityLevel: AuthorityLevel;
      let operation: operation;
      if (keyType === KeyType.posting) {
        authorityLevel = AuthorityLevel.POSTING;
        const voteLoginChallenge: vote = vote.create({
          voter: username,
          author: "author",
          permlink: loginChallenge,
          weight: 10000,
        });
        operation = { vote: voteLoginChallenge };
      } else if (keyType === KeyType.active) {
        authorityLevel = AuthorityLevel.ACTIVE;
        const transferLoginChallenge: transfer = transfer.create({
          from_account: username,
          to_account: username,
          amount: hiveChain.hive(1),
          memo: loginChallenge,
        });
        operation = { transfer: transferLoginChallenge };
      } else {
        throw new Error('Unsupported keyType');
      }

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
      const pack = signer.pack;
      const signature = await signer.signTransaction({
        digest: txBuilder.sigDigest,
        transaction: tx
      });
      logger.info('signature: %s', signature);
      txBuilder.build(signature);

      logger.info('transaction: %o', {
        pack,
        toApi: txBuilder.toApi(),
        toString: txBuilder.toString(),
        parsedToApi: JSON.parse(txBuilder.toApi()),
        parsedToString: JSON.parse(txBuilder.toString()),
      });

      // FIXME temporary solution. The logic that verifies user's
      // signature will be moved to server.
      const isAuthenticated = await authorityChecker(
        JSON.parse(txBuilder.toApi()) as ApiTransaction,
        username,
        authorityLevel,
        pack,
        strict
        );

      const mode = strict ? 'strict' : 'non-strict';
      if (isAuthenticated) {
        logger.info(
          'User %s passed authentication in %s mode with key type %s',
          username, mode, keyType
          );
      } else {
        logger.info(
          'User %s failed authentication in %s mode with key type %s',
          username, mode, keyType
          );
      }

      signatures[keyType] = signature;

      // FIXME
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

  return <DynamicLoginForm errorMessage={errorMsg} onSubmit={onSubmit} />;
}
