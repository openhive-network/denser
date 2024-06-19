import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { useRouter } from 'next/router';
import createHttpError from 'http-errors';
import { getTranslations } from '@/auth/lib/get-translations';
import { oidc } from '@smart-signer/lib/oidc';
import { redirect } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

export default function InteractionPage({
  redirectTo
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const uid = router.query.slug;

  if (redirectTo) {
    router.push(redirectTo);
  }

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

// export async function getServerSideProps<GetServerSideProps>({ req, res }) {
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  let redirectTo = '';
  return {
    props: {
      redirectTo,
      ...(await getTranslations(ctx))
    }
  };
};
