import { GetServerSideProps } from 'next';
import { useState, useEffect } from "react";
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getTranslations } from '@/auth/lib/get-translations';
import { Button } from '@hive/ui/components/button';
import { Signer, vote } from '@smart-signer/lib/signer';
import { myPromiseModal } from '@smart-signer/components/alert-dialog-password';
import { DialogPasswordModalPromise } from '@smart-signer/components/dialog-password';

import { getLogger } from '@hive/ui/lib/logging';
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

  const testVote = async () => {
    if (!user || !user.isLoggedIn) return;
    const vote: vote = {
      voter: user.username,
      author: 'afhsdfg',
      permlink: 'sdagjvxbn',
      weight: 10000
    };

    // FIXME!
    const signer = new Signer(user);

    try {
      await signer.broadcastTransaction({
        operation: { vote },
        loginType: user.loginType,
        username: user.username
      });
    } catch (error) {
      logger.error(error);
    }
  }

  const openPromiseModal = async () => {
    logger.info('Opening myPromiseModal');
    try {
      const result = await myPromiseModal({
        isOpen: true,
        title: 'Enter your WIF password',
      });
      logger.info('Return from myPromiseModal: %s', result);
    } catch (error) {
      logger.info('Return from myPromiseModal %s', error);
    }
  };

  const openDialogPassword = async () => {
    logger.info('Opening DialogPasswordModalPromise');
    try {
      const result = await DialogPasswordModalPromise({
        isOpen: true,
        title: 'Enter your WIF password',
      });
      logger.info('Return from DialogPasswordModalPromise: %s', result);
    } catch (error) {
      logger.info('Return from DialogPasswordModalPromise %s', error);
    }
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
            <Button onClick={testVote} variant="redHover" size="sm" className="h-10">
              Test Vote
            </Button>
            <Button onClick={openPromiseModal} variant="redHover" size="sm" className="h-10">
              Open Alert Window
            </Button>
            <Button onClick={openDialogPassword} variant="redHover" size="sm" className="h-10">
              Open Promise Modal
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
