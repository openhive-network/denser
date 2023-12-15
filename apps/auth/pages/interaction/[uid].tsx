import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from 'next-i18next.config';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { useRouter } from 'next/router';
import { oidc } from '@/auth/lib/oidc';
import { getLogger } from "@hive/ui/lib/logging";

const logger = getLogger('app');

export default function InteractionPage({
  a
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const uid = router.query.slug;

  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2
        sm:gap-0 sm:justify-around">
      <div className="flex flex-col gap-3 sm:gap-8 sm:mr-4">
        <div className="font-bold text-lg sm:text-3xl">Interaction</div>
      </div>
    </div>
  );
}

// export async function getServerSideProps<GetServerSideProps>({ req, res }) {
export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  // console.log({req});
  // console.log({res});
  const a = 12;

  try {
    const {
      uid, prompt, params, session,
    } = await oidc.interactionDetails(req, res);

    logger.info({
      uid, prompt, params, session,
    });

    // const client = await oidc.Client.find(params.client_id);
  } catch (err) {
    throw err;
  }


  return {
    props: {
      a,
      ...(await serverSideTranslations(req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_auth'])),
    },
  };
}
