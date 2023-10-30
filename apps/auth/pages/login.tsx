import { useState } from 'react'
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { withIronSessionSsr } from "iron-session/next";
import secureRandom from 'secure-random';
import { KeyRole } from '@hiveio/dhive';
import { KeychainKeyTypes, KeychainKeyTypesLC } from 'hive-keychain-commons';
import { LoginForm, LoginFormData } from "@/auth/components/login-form";
import { useUser } from '@/auth/lib/use-user';
import { fetchJson, FetchError } from '@/auth/lib/fetch-json';
import { getLogger } from "@hive/ui/lib/logging";
import { sessionOptions } from '@/auth/lib/session';
import { Signatures, LoginData } from '@/auth/pages/api/login';

const logger = getLogger('app');

export default function LoginPage({
  loginChallenge
}: InferGetServerSidePropsType<typeof getServerSideProps>) {

  logger.info('bamboo LoginPage loginChallenge', loginChallenge);

  // Here we just check if user is already logged in and we redirect him
  // to profile page, if he is.
  const { mutateUser } = useUser({
    redirectTo: '/profile',
    redirectIfFound: true,
  });

  const [errorMsg, setErrorMsg] = useState('');

  const signatures: Signatures = {};

  // Build signed message for sending to back-end.
  const makeSignatures = async (
        signWith: string,
        username: string,
        keyType: KeychainKeyTypesLC = KeychainKeyTypesLC.posting
      ): Promise<Signatures> => {
    logger.info('in makeSignatures %o', {signWith, username});
    const signatures: Signatures = {};
    const challenge = { token: loginChallenge };
    const message = JSON.stringify(challenge, null, 0);

    if (signWith === 'keychain') {
      try {
        const response: any = await new Promise((resolve) => {
          window.hive_keychain.requestSignBuffer(
            username,
            message,
            KeychainKeyTypes[keyType],
            (res: any) => {
              resolve(res);
            }
          );
        });

        logger.info('makeSignatures', { response });

        if (response.success) {
          signatures.posting = response.result;
        } else {
          throw new Error(response.error);
        }
      } catch (error) {
        throw error;
      }
    }

    return signatures;

  }

  const onSubmit = async (data: LoginFormData) => {
    logger.info('onSubmit form data', data);
    setErrorMsg('');

    const { username } = data;
    let loginType = 'password';
    let signatures: Signatures = {};
    let hivesignerToken = '';

    if (data.useKeychain) {
      try {
        loginType = 'keychain';
        signatures = await makeSignatures('keychain', username);
      } catch (error) {
        logger.error('onSubmit error in makeSignatures', error);
        setErrorMsg('Error in signing data for login');
      }
    }

    const body: LoginData = {
      username,
      signatures,
      loginType,
      hivesignerToken,
    };

    try {
      mutateUser(
        await fetchJson('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      )
    } catch (error) {
      if (error instanceof FetchError) {
        setErrorMsg(error.data.error?.message
            || 'Error in fetching data from Hive API server');
      } else {
        logger.error('onSubmit unexpected error', error);
        setErrorMsg('Unexpected error');
      }
    }
  };

  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2
        sm:gap-0 sm:justify-around">
      <div className="flex flex-col gap-3 sm:gap-8 sm:mr-4">
        <LoginForm
          errorMessage={errorMsg}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = withIronSessionSsr(
  async function getServerSideProps({ req }) {
    let loginChallenge = req.session.loginChallenge;
    if (!loginChallenge) {
      loginChallenge = secureRandom.randomBuffer(16).toString('hex');
      req.session.loginChallenge = loginChallenge;
      await req.session.save();
    }
    return {
      props: {
        loginChallenge,
      },
    };
  },
  sessionOptions
);
