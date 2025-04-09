import { useQuery } from '@tanstack/react-query';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { Button } from '@hive/ui';
import { getAccount } from '@transaction/lib/hive';
import { useTranslation } from 'next-i18next';
import { getAccountMetadata, getTranslations } from '@/wallet/lib/get-translations';
import Head from 'next/head';

function AuthorRewardsPage({ username, metadata }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation('common_wallet');
  const {
    data: accountData,
    isLoading: accountLoading,
    isError: accountError
  } = useQuery(['accountData', username], () => getAccount(username), {
    enabled: Boolean(username)
  });

  return (
    <>
      <Head>
        <title>{metadata.tabTitle}</title>
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
      </Head>
      <ProfileLayout>
        <div>
          <div className="flex flex-col border-b-2 p-2 text-sm sm:flex-row sm:justify-between sm:p-4">
            <div>{t('profile.estimated_author_rewards_last_week')}</div>
            <div className="flex flex-col">
              <div className="flex flex-col">
                <span>0.000 HIVE POWER</span>
                <span>0.000 HIVE</span>
                <span>0.000 HBD</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 p-2 sm:p-4">
            <h4 className="text-lg">{t('profile.author_rewards_history')}</h4>
            <div className="flex justify-between">
              <Button variant="outlineRed" size="sm" disabled>
                {t('profile.newer')}
              </Button>
              <Button variant="outlineRed" size="sm" disabled>
                {t('profile.older')}
              </Button>
            </div>
          </div>
        </div>
      </ProfileLayout>
    </>
  );
}

export default AuthorRewardsPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const username = ctx.params?.param as string;

  if (username[0] !== '@') {
    return {
      notFound: true
    };
  }

  return {
    props: {
      metadata: await getAccountMetadata(username, 'Author Rewards'),
      username: username.replace('@', ''),
      ...(await getTranslations(ctx))
    }
  };
};
