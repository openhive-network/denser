import { future_extensions } from '@hiveio/wax';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';

type ProposalVotesParams = { proposal_ids: string[]; approve: boolean; extensions: future_extensions[] };

/** Makes update proposal votes transaction. */
export const useUpdateProposalVotesMutation = () =>
  useOperationMutation({
    name: 'useUpdateProposalVotesMutation',
    run: ({ proposal_ids, approve, extensions }: ProposalVotesParams) =>
      transactionService.updateProposalVotes(proposal_ids, approve, extensions, OBSERVE),
    reportErrors: false
  });
