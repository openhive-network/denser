'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Big from 'big.js';
import { DEFAULT_PARAMS_FOR_PROPOSALS, getProposals, getUserVotes } from '@/wallet/lib/hive';
import { IGetProposalsParams } from '@hive/common-hiveio-packages/wax';
import { getDynamicGlobalProperties } from '@transaction/lib/hive-api';
import { ProposalsFilter } from '@/wallet/components/proposals-filter';
import { ProposalListItem } from '@/wallet/components/proposals-list-item';
import { ProposalsDhfSummary } from '@/wallet/components/proposals-dhf-summary';
import { ProposalsFundingLine } from '@/wallet/components/proposals-funding-line';
import { useDhfFundingQuery } from '@/wallet/components/hooks/use-dhf-funding';
import { useProposalsPaid } from '@/wallet/components/hooks/use-proposals-paid';
import { REFUND_ACCOUNTS } from '@/wallet/lib/constants';
import { isReturnProposal } from '@/wallet/lib/dhf-funding';
import {
  fundingMarks,
  isProposalStatusTab,
  matchesProposalSearch,
  uniqueProposals,
  type FundingMarks
} from '@/wallet/lib/proposals-list';
import { convertStringToBig } from '@ui/lib/helpers';
import { Skeleton } from '@ui/components/skeleton';
import { Tabs, TabsContent } from '@ui/components/tabs';
import { useTranslation } from '@/wallet/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';

const NO_FUNDING_MARKS: FundingMarks = { lineIndex: -1, badges: [] };

export default function ProposalsPage() {
  const { user } = useUserClient();
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
  const [search, setSearch] = useState('');
  const { data: votes } = useQuery({
    queryKey: ['accountVotes', user.username],
    queryFn: () => getUserVotes(user.username),
    enabled: !!user?.username
  });
  const { data: funding, isPending: fundingLoading } = useDhfFundingQuery();
  const proposalsData = useInfiniteQuery({
    queryKey: ['proposals', filterStatus, sortOrder, orderDirection],
    queryFn: ({ pageParam: last_id }: { pageParam: number | undefined }) =>
      getProposals({
        last_id,
        status: filterStatus,
        order: sortOrder,
        order_direction: orderDirection
      }),
    initialPageParam: undefined,
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
            }
          }))
        )
      };
    }
  });
  const { data: dynamicData, isPending: dynamicLoading } = useQuery({
    queryKey: ['dynamicGlobalProperties'],
    queryFn: () => getDynamicGlobalProperties(),
    select: (data) => {
      return {
        ...data,
        total_vesting_fund_hive: convertStringToBig(data.total_vesting_fund_hive),
        total_vesting_shares: convertStringToBig(data.total_vesting_shares)
      };
    }
  });

  const loadedProposals = useMemo(() => uniqueProposals(proposalsData.data?.pages ?? []), [proposalsData.data]);
  const proposals = useMemo(
    () => loadedProposals.filter((proposal) => matchesProposalSearch(proposal, search)),
    [loadedProposals, search]
  );
  const loadedProposalIds = useMemo(
    () => loadedProposals.map((proposal) => proposal.proposal_id),
    [loadedProposals]
  );
  const paidById = useProposalsPaid(loadedProposalIds);
  const marks = useMemo(
    () =>
      funding
        ? fundingMarks(
            proposals,
            funding.payouts,
            sortOrder === 'by_total_votes' && orderDirection === 'descending' && !search.trim(),
            REFUND_ACCOUNTS
          )
        : NO_FUNDING_MARKS,
    [proposals, funding, sortOrder, orderDirection, search]
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

  const handleStatusChange = (value: string) => {
    if (isProposalStatusTab(value)) setFilterStatus(value);
  };

  return (
    <Tabs
      value={filterStatus}
      onValueChange={handleStatusChange}
      className="mx-auto flex max-w-5xl flex-col gap-5 p-5"
      data-testid="proposals-body"
    >
      <ProposalsFilter
        status={filterStatus}
        onStatusChange={handleStatusChange}
        search={search}
        onSearchChange={setSearch}
        onChangeSortOrder={setSortOrder}
        orderValue={sortOrder}
        orderDirection={orderDirection}
        onOrderDirection={setOrderDirection}
      />
      <ProposalsDhfSummary funding={funding} isPending={fundingLoading} />

      <TabsContent value={filterStatus} className="mt-0 flex flex-col gap-5">
        {proposalsData.isPending || dynamicLoading ? (
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
        ) : proposals.length === 0 ? (
          <p className="mt-16 text-center text-xl" data-testid="proposals-no-search-results">
            {t('proposals_page.no_search_results')}
          </p>
        ) : (
          proposals.map((proposal, index) => (
            <Fragment key={proposal.proposal_id}>
              <ProposalListItem
                voted={
                  votes?.find((vote) => vote.proposal.proposal_id === proposal.proposal_id) ? true : false
                }
                totalVestingFund={dynamicData.total_vesting_fund_hive}
                totalShares={dynamicData.total_vesting_shares}
                proposalData={proposal}
                funding={marks.badges[index]}
                isReturnProposal={isReturnProposal(proposal, REFUND_ACCOUNTS)}
                paid={paidById.get(proposal.proposal_id)}
              />
              {index === marks.lineIndex ? <ProposalsFundingLine /> : null}
            </Fragment>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
