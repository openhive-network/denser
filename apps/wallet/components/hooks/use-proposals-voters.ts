import { getProposalVotes } from "@/wallet/lib/hive";
import { useQuery } from "@tanstack/react-query";

export const useProposalsVotersQuery = (id: number) => {
  return useQuery(["proposalVoters", id], () => getProposalVotes(id), {
    enabled: Boolean(id),
  });
};
