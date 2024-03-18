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
    authenticateOnBackend,
    strict,
    i18nNamespace = 'smart-signer',
    enabledLoginTypes = [
      LoginType.hbauth,
      LoginType.keychain,
      LoginType.wif,
    ]
}: {
    authenticateOnBackend: boolean,
    strict: boolean; // if true use strict authentication
    i18nNamespace?: string
    enabledLoginTypes?: LoginType[];
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

      let operation: operation;
      if (keyType === KeyType.posting) {
        const voteLoginChallenge: vote = vote.create({
          voter: username,
          author: "author",
          permlink: loginChallenge,
          weight: 10000,
        });
        operation = { vote: voteLoginChallenge };
      } else if (keyType === KeyType.active) {
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

      signatures[keyType] = signature;

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
      setErrorMsg(t('pageLogin.signingFailed'));
      return;
    }

  };

  return <DynamicLoginForm
    errorMessage={errorMsg}
    onSubmit={onSubmit}
    enabledLoginTypes={enabledLoginTypes}
  />;
}
