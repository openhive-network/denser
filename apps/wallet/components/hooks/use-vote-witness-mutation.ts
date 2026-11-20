import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { useTranslation } from '@/wallet/i18n/client';

type WitnessVoteParams = { account: string; witness: string; approve: boolean };

/** Makes witness vote transaction. */
export function useWitnessVoteMutation() {
  const { username } = useUserClient().user;
  const { t } = useTranslation('common_wallet');
  return useOperationMutation({
    name: 'useWitnessVoteMutation',
    run: ({ account, witness, approve }: WitnessVoteParams) =>
      transactionService.witnessVote(account, witness, approve, OBSERVE),
    successToast: (_data, { approve, witness }) => ({
      description: approve
        ? t('witnesses_page.vote_success', { witness })
        : t('witnesses_page.unvote_success', { witness })
    }),
    invalidate: () => [['listWitnessVotesData'], ['accountData', username], ['witnesses']],
    reportErrors: false
  });
}
