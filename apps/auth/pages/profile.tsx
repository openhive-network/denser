import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getServerSidePropsDefault } from '../lib/get-translations';
import { pascalCase } from 'change-case';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;

export default function Profile() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { user } = useUser({
    redirectTo: '/login',
    redirectIfFound: false
  });

  return (
    <div
      className="mx-2 flex flex-col gap-24 pt-16 sm:flex-row
        sm:justify-around sm:gap-0"
    >
      {isClient && user && user.username && (
        <div className="flex flex-col gap-3 sm:mr-4 sm:gap-8">
          <h1>Your Hive profile</h1>
          <p>
            You are logged in as user <strong>{user.username}</strong>{' '}
            with <strong>{pascalCase(user.loginType)}</strong> method.
          </p>
        </div>
      )}
    </div>
  );
}

