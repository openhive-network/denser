import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { consentPageController } from '@smart-signer/lib/consent-page-controller';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

export default function ConsentPage() {
  const router = useRouter();

  // Here we just check if user is already logged in and we redirect him
  // to profile page, if he is.
  const { user } = useUser({
    redirectTo: '/',
    redirectIfFound: true
  });

  return (
    <div className="flex justify-center">
      <div className="mt-32 max-w-[380px] rounded-md p-0 sm:mt-auto sm:max-w-[450px] sm:px-0">
        Consent
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  logger.info('consent page getServerSideProps');
  return await consentPageController(ctx);
};
