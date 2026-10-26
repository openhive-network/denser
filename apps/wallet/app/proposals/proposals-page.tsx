'use client';

import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_PARAMS_FOR_PROPOSALS, getUserVotes } from '@/wallet/lib/hive';
import { IGetProposalsParams } from '@hive/common-hiveio-packages/wax';
import { getDynamicGlobalProperties } from '@transaction/lib/hive-api';
import { ProposalsFilter } from '@/wallet/components/proposals-filter';
import { ProposalListItem } from '@/wallet/components/proposals-list-item';
import { ProposalsDhfSummary } from '@/wallet/components/proposals-dhf-summary';
import { ProposalsFundingLine } from '@/wallet/components/proposals-funding-line';
import { useDhfFundingQuery } from '@/wallet/components/hooks/use-dhf-funding';
import { useProposalsPaid } from '@/wallet/components/hooks/use-proposals-paid';
import { useProposalsList } from '@/wallet/components/hooks/use-proposals-list';
import { useRevealOnScroll } from '@/wallet/components/hooks/use-reveal-on-scroll';
import { REFUND_ACCOUNTS } from '@/wallet/lib/constants';
import { isReturnProposal } from '@/wallet/lib/dhf-funding';
import { fundingMarks, isProposalStatusTab, type FundingMarks } from '@/wallet/lib/proposals-list';
import { convertStringToBig } from '@ui/lib/helpers';
import { Skeleton } from '@ui/components/skeleton';
import { Tabs, TabsContent } from '@ui/components/tabs';
import { useTranslation } from '@/wallet/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';

const NO_FUNDING_MARKS: FundingMarks = { lineIndex: -1, badges: [] };
/** How many proposals the list renders at first, and how many more each scroll to its end reveals. */
const RENDER_STEP = 30;

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
  const { listQuery: proposalsData, proposals } = useProposalsList(
    { status: filterStatus, order: sortOrder, order_direction: orderDirection },
    search
  );
  const renderedCount = useRevealOnScroll(
    proposals.length,
    RENDER_STEP,
    [filterStatus, sortOrder, orderDirection, search].join('|')
  );
  const renderedProposals = useMemo(() => proposals.slice(0, renderedCount), [proposals, renderedCount]);
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

  const searching = search.trim() !== '';
  const paidProposalIds = useMemo(
    () => renderedProposals.map((proposal) => proposal.proposal_id),
    [renderedProposals]
  );
  const paidById = useProposalsPaid(paidProposalIds);
  const marks = useMemo(
    () =>
      funding
        ? fundingMarks(
            proposals,
            funding.payouts,
            sortOrder === 'by_total_votes' && orderDirection === 'descending' && !searching,
            REFUND_ACCOUNTS
          )
        : NO_FUNDING_MARKS,
    [proposals, funding, sortOrder, orderDirection, searching]
  );

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
        ) : proposalsData.data?.length === 0 || !dynamicData ? (
          <main>
            <p className="mt-32 text-center text-3xl" data-testid="cannot-show-you-any-proposals">
              {t('global.sorry_cant_show')}
            </p>
            <p className="text-center text-xl text-gray-400">{t('global.its_probably')}</p>
          </main>
        ) : (
          <>
            {proposals.length === 0 ? (
              <p className="mt-16 text-center text-xl" data-testid="proposals-no-search-results">
                {t('proposals_page.no_search_results')}
              </p>
            ) : null}
            {renderedProposals.map((proposal, index) => (
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
            ))}
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}
