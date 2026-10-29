import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Big from 'big.js';
import { IGetProposalsParams, IProposal } from '@hive/common-hiveio-packages/wax';
import { getLogger } from '@hive/ui/lib/logging';
import { getProposals, type ProposalData } from '@/wallet/lib/hive';
import { matchesProposalSearch } from '@/wallet/lib/proposals-list';

const logger = getLogger('app');

/**
 * database_api's single-query limit (DATABASE_API_SINGLE_QUERY_LIMIT), far more proposals than any
 * listing holds. `list_proposals` does not page by `last_id`, so a listing is read in one call.
 */
const PROPOSALS_LIST_LIMIT = 1000;

export type ProposalsListParams = Pick<IGetProposalsParams, 'status' | 'order' | 'order_direction'>;

let warnedFullListing = false;

const warnIfListingFull = (proposals: IProposal[], params: ProposalsListParams) => {
  if (warnedFullListing || proposals.length < PROPOSALS_LIST_LIMIT) return;
  warnedFullListing = true;
  logger.warn(
    'list_proposals returned %d proposals, its limit, for %o: proposals past it are not listed',
    proposals.length,
    params
  );
};

const toProposalData = (proposal: IProposal): ProposalData => ({
  ...proposal,
  total_votes: new Big(parseFloat(proposal.total_votes).toFixed(2)),
  daily_pay: {
    amount: new Big(proposal.daily_pay.amount).div(1000)
  }
});

const toProposalDataList = (proposals: IProposal[]): ProposalData[] => proposals.map(toProposalData);

/**
 * A whole proposals listing, read in one call per status, order and direction, and `proposals`,
 * those of it matching `search`, in the listing's order.
 */
export const useProposalsList = (params: ProposalsListParams, search: string) => {
  const { status, order, order_direction } = params;
  const listQuery = useQuery({
    queryKey: ['proposals', status, order, order_direction],
    queryFn: async () => {
      const proposals = await getProposals({ status, order, order_direction, limit: PROPOSALS_LIST_LIMIT });
      warnIfListingFull(proposals, { status, order, order_direction });
      return proposals;
    },
    select: toProposalDataList
  });
  const listing = listQuery.data;
  const proposals = useMemo(
    () => (listing ?? []).filter((proposal) => matchesProposalSearch(proposal, search)),
    [listing, search]
  );

  return { listQuery, proposals };
};
