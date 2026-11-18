import { useEffect, useState } from 'react';
import { cn } from '@hive/ui/lib/utils';
import { Icons } from '@hive/ui/components/icons';
import { handleError } from '@ui/lib/handle-error';
import { useTranslation } from '@/wallet/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useUpdateProposalVotesMutation } from '@hive/wallet/components/hooks/use-update-proposal-votes-mutation';
import { isProposalVotable } from '@/wallet/lib/proposals-list';
import DialogLogin from './dialog-login';
import { ProposalEndedVoteButton } from './proposal-ended-vote-button';

const VOTE_FOCUS_RING =
  'rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2';

interface ProposalVoteControlProps {
  proposalId: number;
  status: string;
  voted: boolean;
}

/**
 * A proposal's vote button: it votes or unvotes for a logged-in user, opens the login dialog
 * otherwise, and is disabled once the proposal ended.
 */
export function ProposalVoteControl({ proposalId, status, voted }: ProposalVoteControlProps) {
  const { t } = useTranslation('common_wallet');
  const { user } = useUserClient();
  const updateProposalVotesMutation = useUpdateProposalVotesMutation();
  const [loading, setLoading] = useState(false);
  const [voteSuccess, setVotesSuccess] = useState(voted);
  const voteLabel = t('proposals_page.vote_for_proposal', { id: proposalId });
  const removeVoteLabel = t('proposals_page.remove_vote_for_proposal', { id: proposalId });
  const votable = isProposalVotable({ status });

  useEffect(() => {
    setVotesSuccess(voted);
  }, [voted]);

  async function updateProposalVotes() {
    if (!votable) return;
    const params = {
      proposal_ids: [String(proposalId)],
      approve: !voteSuccess,
      extensions: []
    };

    try {
      setLoading(true);
      await updateProposalVotesMutation.mutateAsync(params);
      setVotesSuccess((prev) => !prev);
    } catch (error) {
      handleError(error, {
        method: 'updateProposalVotes',
        params
      });
    } finally {
      setLoading(false);
    }
  }

  if (!votable) return <ProposalEndedVoteButton label={voteLabel} voted={voteSuccess} />;

  if (user && user.isLoggedIn) {
    return (
      <button
        type="button"
        className={cn('group relative flex', VOTE_FOCUS_RING)}
        aria-label={voteSuccess ? removeVoteLabel : voteLabel}
        aria-pressed={voteSuccess}
        aria-busy={loading}
        onClick={loading ? undefined : updateProposalVotes}
      >
        {loading ? (
          <Icons.spinner className="animate-spin text-red-500" />
        ) : (
          <>
            <span className="opocity-75 absolute inline-flex h-6 w-6 rounded-full bg-red-500 p-0 group-hover:animate-ping dark:bg-red-400"></span>
            <Icons.arrowUpCircle
              viewBox="1.7 1.7 20.7 20.7"
              className={cn(
                'relative inline-flex h-6 w-6 cursor-pointer rounded-full bg-white stroke-1 text-red-500 dark:bg-slate-800',
                {
                  'bg-red-500! text-white': voteSuccess
                }
              )}
              data-testid="voting-button-icon"
            />
          </>
        )}
      </button>
    );
  }

  return (
    <DialogLogin>
      <button type="button" className={cn('group relative flex', VOTE_FOCUS_RING)} aria-label={voteLabel}>
        <span className="opocity-75 absolute inline-flex h-6 w-6 rounded-full bg-red-500 p-0 group-hover:animate-ping dark:bg-red-400"></span>
        <Icons.arrowUpCircle
          viewBox="1.7 1.7 20.7 20.7"
          className="relative inline-flex h-6 w-6 cursor-pointer rounded-full bg-white stroke-1 text-red-500 dark:bg-slate-800"
          data-testid="voting-button-icon"
        />
      </button>
    </DialogLogin>
  );
}
