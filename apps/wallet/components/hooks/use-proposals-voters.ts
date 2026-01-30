import { getProposalVotes } from "@/wallet/lib/hive";
import { useQuery } from "@tanstack/react-query";

export const useProposalsVotersQuery = (id: number) => {
  return useQuery({
    queryKey: ["proposalVoters", id],
    queryFn: () => getProposalVotes(id),
    enabled: Boolean(id),
  });
};
