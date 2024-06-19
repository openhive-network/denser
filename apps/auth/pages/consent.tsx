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
    <div
      className="mx-2 flex flex-col gap-24 pt-16 sm:flex-row
        sm:justify-around sm:gap-0"
    >
      <div className="flex flex-col gap-3 sm:mr-4 sm:gap-8">
        <div className="text-lg font-bold sm:text-3xl">Interaction</div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  logger.info('consent page getServerSideProps');
  return await consentPageController(ctx);
};
