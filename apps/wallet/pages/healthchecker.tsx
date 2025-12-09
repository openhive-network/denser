'use client';

import HealthCheckerWrapper from '@/wallet/components/healthchecker-wrapper';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { getTranslations } from '@/wallet/lib/get-translations';

function Healthchecker({ }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation('common_wallet');

  return (
    <>
      <Head>
        <title>Healthchecker</title>
        <meta property="og:title" content="Healthchecker" />
        <meta property="og:description" content="Health checker for wallet APIs" />
      </Head>
      <div className="flex flex-col gap-8 p-4">
        <HealthCheckerWrapper />
      </div>
    </>
  );
}

export default Healthchecker;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return {
    props: {
      ...(await getTranslations(ctx))
    }
  };
};
