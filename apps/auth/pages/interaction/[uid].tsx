import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { useRouter } from 'next/router';
import { getTranslations } from '../../lib/get-translations';
import { getLogger } from '@ui/lib/logging';
import { siteConfig } from '@ui/config/site';

const logger = getLogger('app');

export default function InteractionPage({
  redirectTo
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();

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

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  if (!siteConfig.oidcEnabled) return { notFound: true };
  return {
    props: {
      ...(await getTranslations(ctx))
    }
  };
};
