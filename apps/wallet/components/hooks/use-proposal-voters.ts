import { useQuery } from '@tanstack/react-query';
import { getGovernanceWeights, getProposalVoterNames } from '@/wallet/lib/hive';
import { fetchProposalVoters, vestsToHp, type VestingTotals } from '@/wallet/lib/voters';

/** Every voter of proposal `id` with their weight in HP at `totals`, by weight, largest first. */
export const useProposalVotersQuery = (id: number, totals: VestingTotals) =>
  useQuery({
    queryKey: ['proposalVoters', id],
    queryFn: () =>
      fetchProposalVoters(
        {
          voterNamesFrom: getProposalVoterNames,
          weightsOf: getGovernanceWeights,
          vestsToHp: (vests) => vestsToHp(vests, totals)
        },
        id
      )
  });
