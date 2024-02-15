import { GetServerSideProps } from 'next';
import { useState, useEffect } from "react";
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getTranslations } from '@/auth/lib/get-translations';
import { Button } from '@hive/ui/components/button';
import { Signer, vote } from '@smart-signer/lib/signer';
import { DialogPasswordModalPromise } from '@smart-signer/components/dialog-password';
import { verifySignature } from '@smart-signer/lib/utils';
import { THexString, transaction, createHiveChain, createWaxFoundation, operation, ITransactionBuilder } from '@hive/wax/web';

import { getLogger } from '@hive/ui/lib/logging';
import { SignerKeychain } from '@smart-signer/lib/signer-keychain';
const logger = getLogger('app');

export default function Profile() {

  const [isClient, setIsClient] = useState(false)
  useEffect(() => {
    setIsClient(true)
  }, [])

  const { user } = useUser({
    redirectTo: '/login',
    redirectIfFound: false,
  });

  const developerAccounts = [
    'guest4test',
    'guest4test7',
    'stirlitz',
  ];

  const vote: vote = {
    voter: user?.username || '',
    author: 'gtg',

    // permlink: 'power-to-the-hive-but-just-a-little',
    permlink: 'non-existing-permlink-q523-73867',

    weight: 10000
  };

  const testSignerBroadcast = async () => {
    if (!user || !user.isLoggedIn) return;
    const { username, loginType } = user;
    const signer = new Signer({ username, loginType });
    try {
      await signer.broadcastTransaction({
        operation: { vote },
      });
    } catch (error) {
      logger.error(error);
    }
  }

  const testSignerSignHbauth = async () => {
    if (!user || !user.isLoggedIn) return;
    const { username, loginType } = user;
    const signer = new Signer({ username, loginType });
    try {
      const transaction = await signer.createTransaction({
        operation: { vote },
      });
      const wax = await createWaxFoundation();
      const txBuilder = new wax.TransactionBuilder(transaction);
      const tx = txBuilder.build();
      const signature = await signer.signTransaction({
        digest: txBuilder.sigDigest,
        transaction: tx
      });
      logger.info('signature: %s', signature);
    } catch (error) {
      logger.error(error);
    }
  }

  const testSignerSignKeychain = async () => {
    if (!user || !user.isLoggedIn) return;
    const { username, loginType } = user;
    const signer = new SignerKeychain({ username, loginType });
    try {
      const signature = await signer.signTransactionOld({operation: { vote }});
      logger.info('signature: %s', signature);
    } catch (error) {
      logger.error(error);
    }
  }

  const openDialogPassword = async () => {
    try {
      const result = await DialogPasswordModalPromise({
        isOpen: true,
      });
      logger.info('Return from DialogPasswordModalPromise: %s', result);
    } catch (error) {
      logger.info('Return from DialogPasswordModalPromise %s', error);
    }
  };


  const verify = async () => {
    const keychainTxJson =  '{"ref_block_num":48287,"ref_block_prefix":3867306819,"expiration":"2024-02-08T09:06:59","operations":[["vote",{"voter":"guest4test","author":"gtg","permlink":"non-existing-permlink-q523-73867","weight":10000}]],"extensions":[]}';
    const keychainSignature = "1f60e89112643d3f6dc00f3b005d281c03e93614e0e8948897a59bba9fb86ef90b62df4b029b20656092138f4edc0aa6fa463d780eb4238466037c4e15253c638e";

    const hbauthTxToApi = '{"ref_block_num":54277,"ref_block_prefix":790505753,"expiration":"2024-02-08T13:58:10","operations":[{"type":"vote_operation","value":{"voter":"guest4test","author":"gtg","permlink":"non-existing-permlink-q523-73867","weight":10000}}]}';
    const hbauthDigest = "fed1a26d12d0f2def991b922a450f3a058d360bf2df4be600ca7f104aec031db";
    const hbauthSignature = "2000d8bf28d1e26ee60c7d905e693b80a16269fc6cec9b98a00379ab98efa2c78556d6bf0ef07fa6051f39a1749d17d2e4a84e80239f55e2dcba77ff2cefec9d05";

    const username = 'stirlitz';
    const keyType = 'posting';
    const result = await verifySignature(
      username,
      '',
      hbauthSignature,
      keyType,
      hbauthTxToApi
      );
    console.log('bamboo', result);
    return result;
  };


  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2
        sm:gap-0 sm:justify-around">
      {isClient && user && user.username && (
        <div className="flex flex-col gap-3 sm:gap-8 sm:mr-4">
          <h1>Your Hive profile</h1>
          <p>
            You are logged in as user <strong>{user.username}</strong>.
          </p>
        {developerAccounts.includes(user.username) && (
          <div className="flex flex-col gap-3">
            <Button onClick={testSignerBroadcast} variant="redHover" size="sm" className="h-10">
              Test Signer Broadcast
            </Button>
            <Button onClick={testSignerSignHbauth} variant="redHover" size="sm" className="h-10">
              Test Signer Sign Hbauth
            </Button>
            <Button onClick={testSignerSignKeychain} variant="redHover" size="sm" className="h-10">
              Test Signer Sign Keychain
            </Button>
            <Button onClick={openDialogPassword} variant="redHover" size="sm" className="h-10">
              Password Promise Modal
            </Button>
            <Button onClick={verify} variant="redHover" size="sm" className="h-10">
              Verify
            </Button>
          </div>
      )}
        </div>
      )}
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return {
    props: {
      ...(await getTranslations(ctx)),
    }
  };
};
