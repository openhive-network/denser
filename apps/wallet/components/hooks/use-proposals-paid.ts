import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getProposalsPayments } from '@/wallet/lib/hive';
import {
  createProposalPaidLoader,
  paidByProposalId,
  proposalPaidQuery,
  type ProposalPaid
} from '@/wallet/lib/proposal-payments';

const loadProposalPaid = createProposalPaidLoader((proposalIds) => getProposalsPayments(proposalIds));

/**
 * What the DHF has paid each of `proposalIds` so far, by id, from balance-api: one call for the
 * ids not known yet. An id whose total is loading, or that the API node cannot serve, is absent.
 */
export const useProposalsPaid = (proposalIds: readonly number[]): ReadonlyMap<number, ProposalPaid> => {
  const queries = useMemo(
    () => [...new Set(proposalIds)].map((proposalId) => proposalPaidQuery(proposalId, loadProposalPaid)),
    [proposalIds]
  );
  return useQueries({ queries, combine: paidByProposalId });
};
