import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { useQuery } from '@tanstack/react-query';
import {
  DynamicGlobalProperties,
  getDynamicGlobalProperties
} from '@hive/ui/lib/hive';
import clsx from 'clsx';
import { getVestingDelegations } from '@/wallet/lib/hive';
import { numberWithCommas } from '@hive/ui/lib/utils';
import { dateToFullRelative } from '@hive/ui/lib/parse-date';
import Loading from '@hive/ui/components/loading';
import Link from 'next/link';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/wallet/next-i18next.config';
import { useTranslation } from 'next-i18next';

const convertVestsToSteem = (
  vests: number,
  dynamicData: DynamicGlobalProperties
) => {
  const totalFund = parseFloat(dynamicData.total_vesting_fund_hive);
  const totalShares = parseFloat(dynamicData.total_vesting_shares);
  return ((vests * totalFund) / totalShares).toFixed(2);
};

function DelegationsPage({
                           username
                         }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation('common_wallet');
  const router = useRouter();
  const {
    data: vestingData,
    isLoading: vestingLoading,
    isError: vestingError
  } = useQuery(['vestingDelegation', username, '', 50], () =>
    getVestingDelegations(username, '', 50)
  );
  const {
    data: dynamicData,
    isSuccess: dynamicSuccess,
    isLoading: dynamicLoading,
    isError: dynamicError
  } = useQuery(['dynamicGlobalProperties'], () => getDynamicGlobalProperties());

  if (dynamicLoading || vestingLoading) {
    return <Loading loading={dynamicLoading || vestingLoading} />;
  }
  if (!vestingData || !dynamicData) {
    return <p className='my-32 text-center text-3xl'>{t('global.something_went_wrong')}</p>;
  }
  return (
    <ProfileLayout>
      <div className='flex flex-col gap-8 '>
        <div className='flex gap-6 border-b-2 border-zinc-500 px-4 py-2'>
          <Link href={`/@${username}/transfers`}>
            <div className='hover:text-red-600 dark:hover:text-red-400'>
              {t('navigation.wallet_nav.balances')}
            </div>
          </Link>
          <a
            href=''
            className={clsx(
              router.asPath === `/@${username}/delegations`
                ? 'dark:text-slate-100 text-slate-700 font-bold'
                : 'hover:text-red-600 dark:hover:text-red-400'
            )}
          >
            {t('navigation.wallet_nav.delegations')}
          </a>
        </div>
        <table className='w-full'>
          <tbody>
            {vestingData?.map((element) => (
              <tr
                key={element.id}
                className='m-0 p-0 text-sm even:bg-slate-100 dark:even:bg-slate-700'
                data-testid='wallet-delegation-item'
              >
                <td className=' px-4 py-2 '>
                  {numberWithCommas(
                    convertVestsToSteem(
                      parseFloat(element.vesting_shares),
                      dynamicData
                    )
                  )}{" "}
                  HP
                </td>
                <td className=' px-4 py-2 '>{element.delegatee}</td>
                <td className=' px-4 py-2 '>
                  {dateToFullRelative(element.min_delegation_time, t)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProfileLayout>
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
      username: username.replace('@', ''),
      ...(await serverSideTranslations(ctx.req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_wallet']))
    }
  };
};