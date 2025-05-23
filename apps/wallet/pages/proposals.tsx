import { useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Big from 'big.js';
import { DEFAULT_PARAMS_FOR_PROPOSALS, IGetProposalsParams, getProposals } from '@/wallet/lib/hive';
import { getDynamicGlobalProperties } from '@transaction/lib/hive';
import { ProposalsFilter } from '@/wallet/components/proposals-filter';
import moment from 'moment';
import { ProposalListItem } from '@/wallet/components/proposals-list-item';
import { convertStringToBig } from '@ui/lib/helpers';
import { Skeleton } from '@ui/components/skeleton';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { TFunction } from 'i18next';
import { getServerSidePropsDefault } from '../lib/get-translations';
import Head from 'next/head';

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;

function timeStatus(status: string, t: TFunction<'common_wallet', undefined>) {
  switch (status) {
    case 'active':
      return t('proposals_page.started');
    case 'inactive':
      return t('proposals_page.not_started');
    case 'expired':
      return t('proposals_page.finished');
    default:
      return '';
  }
}
const TAB_TITLE = 'Hive Wallet - Proposals';
function ProposalsPage() {
  const { t } = useTranslation('common_wallet');
  const [filterStatus, setFilterStatus] = useState<IGetProposalsParams['status']>(
    DEFAULT_PARAMS_FOR_PROPOSALS.status
  );
  const [sortOrder, setSortOrder] = useState<IGetProposalsParams['order']>(
    DEFAULT_PARAMS_FOR_PROPOSALS.order
  );
  const [orderDirection, setOrderDirection] = useState<IGetProposalsParams['order_direction']>(
    DEFAULT_PARAMS_FOR_PROPOSALS.order_direction
  );

  const proposalsData = useInfiniteQuery(
    ['proposals', filterStatus, sortOrder, orderDirection],
    ({ pageParam: last_id }) =>
      getProposals({
        last_id,
        status: filterStatus,
        order: sortOrder,
        order_direction: orderDirection
      }),
    {
      getNextPageParam: (lastPage) => {
        return lastPage.length >= DEFAULT_PARAMS_FOR_PROPOSALS.limit
          ? lastPage[lastPage.length - 1].id
          : undefined;
      },

      select: (proposals) => {
        return {
          ...proposals,
          pages: proposals.pages.map((page) =>
            page.map((proposal) => ({
              ...proposal,
              total_votes: new Big(parseFloat(proposal.total_votes).toFixed(2)),
              daily_pay: {
                amount: new Big(proposal.daily_pay.amount).div(1000)
              },
              start_date: moment(proposal.start_date).format('MMM D, YYYY'),
              end_date: moment(proposal.end_date).format('MMM D, YYYY'),
              status: timeStatus(proposal.status, t)
            }))
          )
        };
      }
    }
  );
  const { data: dynamicData, isLoading: dynamicLoading } = useQuery(
    ['dynamicGlobalProperties'],
    () => getDynamicGlobalProperties(),
    {
      select: (data) => {
        return {
          ...data,
          total_vesting_fund_hive: convertStringToBig(data.total_vesting_fund_hive),
          total_vesting_shares: convertStringToBig(data.total_vesting_shares)
        };
      }
    }
  );

  useEffect(() => {
    let fetching = false;
    const handleScroll = async (e: Event) => {
      const target = e.target as Document | undefined;
      if (!target?.scrollingElement) return;

      const { scrollHeight, scrollTop, clientHeight } = target.scrollingElement;
      if (!fetching && scrollHeight - scrollTop <= clientHeight * 1.2) {
        fetching = true;
        if (proposalsData.hasNextPage) await proposalsData.fetchNextPage();
        fetching = false;
      }
    };
    document.addEventListener('scroll', handleScroll);
    return () => {
      document.removeEventListener('scroll', handleScroll);
    };
  }, [proposalsData, proposalsData.fetchNextPage, proposalsData.hasNextPage]);
  return (
    <>
      <Head>
        <title>{TAB_TITLE}</title>
      </Head>
      <div className="mx-auto flex max-w-5xl flex-col gap-5 p-5" data-testid="proposals-body">
        <ProposalsFilter
          onChangeFilterStatus={setFilterStatus}
          filterStatus={filterStatus}
          onChangeSortOrder={setSortOrder}
          orderValue={sortOrder}
          orderDirection={orderDirection}
          onOrderDirection={setOrderDirection}
        />

        {proposalsData.isLoading || dynamicLoading ? (
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 p-5">
            <Skeleton className="h-32 w-full bg-slate-300 dark:bg-slate-900" />
            <Skeleton className="h-32 w-full bg-slate-300 dark:bg-slate-900" />
            <Skeleton className="h-32 w-full bg-slate-300 dark:bg-slate-900" />
            <Skeleton className="h-32 w-full bg-slate-300 dark:bg-slate-900" />
            <Skeleton className="h-32 w-full bg-slate-300 dark:bg-slate-900" />
          </div>
        ) : proposalsData.data?.pages[0].length === 0 || !dynamicData ? (
          <main>
            <p className="mt-32 text-center text-3xl" data-testid="cannot-show-you-any-proposals">
              {t('global.sorry_cant_show')}
            </p>
            <p className="text-center text-xl text-gray-400">{t('global.its_probably')}</p>
          </main>
        ) : (
          proposalsData.data?.pages.map((page) =>
            page.map((proposal) => (
              <ProposalListItem
                totalVestingFund={dynamicData.total_vesting_fund_hive}
                totalShares={dynamicData.total_vesting_shares}
                proposalData={proposal}
                key={proposal.proposal_id}
              />
            ))
          )
        )}
      </div>
    </>
  );
}

export default ProposalsPage;
