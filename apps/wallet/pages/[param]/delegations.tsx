import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { useQuery } from '@tanstack/react-query';
import { IDynamicGlobalProperties, getDynamicGlobalProperties } from '@transaction/lib/hive';
import { getDynamicGlobalPropertiesData, getVestingDelegations } from '@/wallet/lib/hive';
import { numberWithCommas } from '@ui/lib/utils';
import { dateToFullRelative } from '@ui/lib/parse-date';
import Loading from '@ui/components/loading';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { useTranslation } from 'next-i18next';
import WalletMenu from '@/wallet/components/wallet-menu';
import { getAccountMetadata, getTranslations } from '@/wallet/lib/get-translations';
import RevokeDialog from '@/wallet/components/revoke-dialog';
import { useUser } from '@smart-signer/lib/auth/use-user';
import Head from 'next/head';

const convertVestsToSteem = (vests: number, dynamicData: IDynamicGlobalProperties) => {
  const totalFund = parseFloat(dynamicData.total_vesting_fund_hive);
  const totalShares = parseFloat(dynamicData.total_vesting_shares);
  return ((vests * totalFund) / totalShares).toFixed(2);
};

function DelegationsPage({ username, metadata }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation('common_wallet');
  const { user } = useUser();
  const accoutOwner = user.isLoggedIn && user.username === username;
  const { data: vestingData, isLoading: vestingLoading } = useQuery(['vestingDelegation', username], () =>
    getVestingDelegations(username, '', 50)
  );
  const { data: dynamicGlobalProperties } = useQuery(['dynamicGlobalPropertiesData'], () =>
    getDynamicGlobalPropertiesData()
  );
  const { data: dynamicData, isLoading: dynamicLoading } = useQuery(['dynamicGlobalProperties'], () =>
    getDynamicGlobalProperties()
  );

  if (dynamicLoading || vestingLoading) {
    return <Loading loading={dynamicLoading || vestingLoading} />;
  }
  if (!vestingData || !dynamicData) {
    return <p className="my-32 text-center text-3xl">{t('global.something_went_wrong')}</p>;
  }
  return (
    <>
      <Head>
        <title>{metadata.tabTitle}</title>
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
      </Head>
      <ProfileLayout>
        <div className="flex flex-col gap-8 ">
          <WalletMenu username={username} />
          <table className="w-full">
            <tbody>
              {vestingData?.map((element) => (
                <tr
                  key={element.id}
                  className="m-0 p-0 text-sm even:bg-slate-100 dark:even:bg-slate-700"
                  data-testid="wallet-delegation-item"
                >
                  <td className="px-1 py-2 sm:px-4">
                    {numberWithCommas(convertVestsToSteem(parseFloat(element.vesting_shares), dynamicData))}{' '}
                    HP
                  </td>
                  <td className="px-1 py-2 sm:px-4">{element.delegatee}</td>
                  <td className="px-1 py-2 sm:px-4">{dateToFullRelative(element.min_delegation_time, t)}</td>
                  <td className="px-1 py-2 sm:px-4">
                    {accoutOwner && dynamicGlobalProperties ? (
                      <RevokeDialog
                        delegator={element.delegator}
                        delegatee={element.delegatee}
                        dynamicGlobalProperties={dynamicGlobalProperties}
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ProfileLayout>
    </>
  );
}

export default DelegationsPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const username = ctx.params?.param as string;

  if (username[0] !== '@') {
    return {
      notFound: true
    };
  }

  return {
    props: {
      metadata: await getAccountMetadata(username, 'Delegations'),
      username: username.replace('@', ''),
      ...(await getTranslations(ctx))
    }
  };
};
