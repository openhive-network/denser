import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getTranslations } from '@/auth/lib/get-translations';
import { Button } from '@hive/ui/components/button';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { SignerHbauth } from '@smart-signer/lib/signer/signer-hbauth';
import { SignerKeychain } from '@smart-signer/lib/signer/signer-keychain';
import { DialogPasswordModalPromise } from '@smart-signer/components/dialog-password';
import { DialogWifModalPromise } from '@smart-signer/components/dialog-wif';
import { verifySignature } from '@smart-signer/lib/utils';
import { vote, createHiveChain, BroadcastTransactionRequest } from '@hive/wax/web';
import { waxToKeychainOperation } from '@smart-signer/lib/signer/signer-keychain';
import { KeyType } from '@smart-signer/types/common';
import { fetchJson } from '@smart-signer/lib/fetch-json';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

export default function Profile() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { user } = useUser({
    redirectTo: '/login',
    redirectIfFound: false
  });

  const developerAccounts = ['guest4test', 'guest4test7', 'stirlitz'];

  const vote: vote = {
    voter: user.username,
    author: 'gtg',

    permlink: 'power-to-the-hive-but-just-a-little',
    // permlink: 'non-existing-permlink-q523-73867',

    weight: 10000
  };

  const { username, loginType } = user;
  const signerOptions: SignerOptions = {
    username,
    loginType,
    keyType: KeyType.posting,
    apiEndpoint: 'https://api.hive.blog',
    storageType: 'localStorage'
  };

  const broadcast = async () => {
    if (!user || !user.isLoggedIn) return;
    try {
      const signer = getSigner(signerOptions);
      const hiveChain = await createHiveChain();
      const txBuilder = await hiveChain.getTransactionBuilder();
      txBuilder.push({ vote });
      txBuilder.validate();
      const tx = txBuilder.build();
      const signature = await signer.signTransaction({
        digest: txBuilder.sigDigest,
        transaction: tx
      });
      logger.info('broadcast signature: %s', signature);
      txBuilder.build(signature);
      logger.info('broadcast txBuilder: %o', txBuilder);

      const trx = {
        trx: JSON.parse(txBuilder.toApi()),
        max_block_age: -1,
      };

      logger.info('broadcast transaction: %o', trx);
      const data = {
        jsonrpc: "2.0",
        method: "network_broadcast_api.broadcast_transaction",
        params: trx,
        id: 1
      };
      logger.info('broadcast data: %o', data);

      const fetchResult = await fetchJson('https://api.hive.blog', {
        method: 'POST',
        body: JSON.stringify(data, null, 0)
      });
      logger.info('broadcast fetchResult: %o', fetchResult);

      const broadcastReq = new BroadcastTransactionRequest(txBuilder);
      logger.info('broadcast broadcastReq: %o', broadcastReq);
      logger.info('broadcast JSON.stringify(broadcastReq): %o', JSON.stringify(broadcastReq));

      // Transmit
      const result = await hiveChain.api.network_broadcast_api.broadcast_transaction(broadcastReq);
      logger.info('broadcast result: %o', result);
    } catch (error) {
      logger.error(error);
    }
  };

  const sign = async () => {
    if (!user || !user.isLoggedIn) return;
    try {
      const hiveChain = await createHiveChain();
      const txBuilder = await hiveChain.getTransactionBuilder();
      txBuilder.push({ vote });
      const tx = txBuilder.build();

      const signerKeychain = new SignerKeychain(signerOptions);
      const signatureKeychain = await signerKeychain.signTransaction({
        digest: txBuilder.sigDigest,
        transaction: tx
      });
      logger.info('signature SignerKeychain: %s', signatureKeychain);

      // Rewrite operations to Keychain format.
      const operations = waxToKeychainOperation(tx.operations);

      const message = JSON.stringify({ ...tx, ...{ operations } }, null, 0); // not working (missing posting authority)
      // const message = JSON.stringify(tx, null, 0); // not working (missing posting authority)

      const signatureKeychainChallenge = await signerKeychain.signChallenge({
        message
      });
      logger.info('signature signatureKeychainChallenge: %s', signatureKeychainChallenge);

      const signerHbauth = new SignerHbauth(signerOptions);
      const signatureHbauth = await signerHbauth.signTransaction({
        digest: txBuilder.sigDigest,
        transaction: tx
      });
      logger.info('signature SignerHbauth: %s', signatureHbauth);

      txBuilder.build(signatureKeychain); // it  works
      // txBuilder.build(signatureKeychainChallenge); // not working (missing posting authority)

      const request = new BroadcastTransactionRequest(txBuilder);

      // Transmit
      const result = await hiveChain.api.network_broadcast_api.broadcast_transaction(request);
      logger.info('broadcast result: %o', result);
    } catch (error) {
      logger.error(error);
    }
  };

  const openDialogPassword = async () => {
    try {
      const result = await DialogPasswordModalPromise({
        isOpen: true
      });
      logger.info('Return from DialogPasswordModalPromise: %s', result);
    } catch (error) {
      logger.info('Return from DialogPasswordModalPromise %s', error);
    }
  };

  const openDialogWif = async () => {
    try {
      const result = await DialogWifModalPromise({
        isOpen: true
      });
      logger.info('Return from DialogWifModalPromise: %s', result);
    } catch (error) {
      logger.info('Return from DialogWifModalPromise %s', error);
    }
  };

  const verify = async () => {
    const keychainTxJson =
      '{"ref_block_num":48287,"ref_block_prefix":3867306819,"expiration":"2024-02-08T09:06:59","operations":[["vote",{"voter":"guest4test","author":"gtg","permlink":"non-existing-permlink-q523-73867","weight":10000}]],"extensions":[]}';
    const keychainSignature =
      '1f60e89112643d3f6dc00f3b005d281c03e93614e0e8948897a59bba9fb86ef90b62df4b029b20656092138f4edc0aa6fa463d780eb4238466037c4e15253c638e';

    const hbauthTxToApi =
      '{"ref_block_num":54277,"ref_block_prefix":790505753,"expiration":"2024-02-08T13:58:10","operations":[{"type":"vote_operation","value":{"voter":"guest4test","author":"gtg","permlink":"non-existing-permlink-q523-73867","weight":10000}}]}';
    const hbauthDigest = 'fed1a26d12d0f2def991b922a450f3a058d360bf2df4be600ca7f104aec031db';
    const hbauthSignature =
      '2000d8bf28d1e26ee60c7d905e693b80a16269fc6cec9b98a00379ab98efa2c78556d6bf0ef07fa6051f39a1749d17d2e4a84e80239f55e2dcba77ff2cefec9d05';

    const username = 'stirlitz';
    const keyType = 'posting';
    const result = await verifySignature(username, '', hbauthSignature, keyType, hbauthTxToApi);
    console.log('bamboo', result);
    return result;
  };

  return (
    <div
      className="mx-2 flex flex-col gap-24 pt-16 sm:flex-row
        sm:justify-around sm:gap-0"
    >
      {isClient && user && user.username && (
        <div className="flex flex-col gap-3 sm:mr-4 sm:gap-8">
          <h1>Your Hive profile</h1>
          <p>
            You are logged in as user <strong>{user.username}</strong> with {user.loginType} method.
          </p>
          {developerAccounts.includes(user.username) && (
            <div className="flex flex-col gap-3">
              <Button onClick={broadcast} variant="redHover" size="sm" className="h-10">
                Broadcast
              </Button>
              <Button onClick={sign} variant="redHover" size="sm" className="h-10">
                Sign
              </Button>
              <Button onClick={openDialogPassword} variant="redHover" size="sm" className="h-10">
                Password Promise Modal
              </Button>
              <Button onClick={openDialogWif} variant="redHover" size="sm" className="h-10">
                Wif Promise Modal
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return {
    props: {
      ...(await getTranslations(ctx))
    }
  };
};
