import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';

type WitnessVoteParams = { account: string; witness: string; approve: boolean };

/** Makes witness vote transaction. */
export function useWitnessVoteMutation() {
  const { username } = useUserClient().user;
  return useOperationMutation({
    name: 'useWitnessVoteMutation',
    run: ({ account, witness, approve }: WitnessVoteParams) =>
      transactionService.witnessVote(account, witness, approve, OBSERVE),
    successToast: (_data, { approve, witness }) => ({
      description: approve
        ? `You have voted for witness ${witness}`
        : `You have removed vote for witness ${witness}`
    }),
    invalidate: () => [['listWitnessVotesData'], ['accountData', username], ['witnesses']],
    reportErrors: false
  });
}
