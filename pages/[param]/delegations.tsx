import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { useQuery } from '@tanstack/react-query';
import { DynamicGlobalProperties, getDynamicGlobalProperties, getVestingDelegations } from '@/lib/hive';
import { numberWithCommas } from '@/lib/utils';
import Layout from '@/components/common/layout';
import { dateToFullRelative } from '@/lib/parse-date';
import ProfileLayout from '@/components/common/profile-layout';
import Loading from '@/components/loading';
import Link from 'next/link';

const convertVestsToSteem = (vests: number, dynamicData: DynamicGlobalProperties) => {
  const totalFund = parseFloat(dynamicData.total_vesting_fund_hive);
  const totalShares = parseFloat(dynamicData.total_vesting_shares);
  return ((vests * totalFund) / totalShares).toFixed(2);
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const username = ctx.params?.param as string;

  if (username[0] !== '@') {
    return {
      notFound: true
    };
  }

  return {
    props: {
      username: username.replace('@', '')
    }
  };
};

function DelegationsPage({ username }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const {
    data: vestingData,
    isLoading: vestingLoading,
    isError: vestingError
  } = useQuery(['vestingDelegation', username, '', 50], () => getVestingDelegations(username, '', 50));
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
    return <p className="my-32 text-center text-3xl">Something went wrong</p>;
  }
  return (
    <ProfileLayout>
      <div className="flex flex-col gap-8 ">
        <div className="flex gap-6 border-b-2 border-zinc-500 px-4 py-2">
          <Link href={`/@${username}/transfers`}>
            <div className="hover:text-red-600 dark:hover:text-blue-400">Balances</div>
          </Link>
          <a href="" className="hover:text-red-600 dark:hover:text-blue-400">
            Delegations
          </a>
        </div>
        <table className="w-full">
          <tbody>
            {vestingData?.map((element) => (
              <tr key={element.id} className="m-0 p-0 text-sm even:bg-slate-100 dark:even:bg-slate-700">
                <td className=" px-4 py-2 ">
                  {numberWithCommas(convertVestsToSteem(parseFloat(element.vesting_shares), dynamicData))} HP
                </td>
                <td className=" px-4 py-2 ">{element.delegatee}</td>
                <td className=" px-4 py-2 ">{dateToFullRelative(element.min_delegation_time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProfileLayout>
  );
}
export default DelegationsPage;
DelegationsPage.getLayout = function getLayout(page: any) {
  return <Layout>{page}</Layout>;
};
