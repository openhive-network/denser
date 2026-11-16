import clsx from 'clsx';
import { useState } from 'react';
import { Icons } from '@hive/ui/components/icons';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { useTranslation } from '@/wallet/i18n/client';
import DialogLogin from './dialog-login';
import WitnessRemoveVote from './witness-remove-vote';

interface WitnessVoteButtonProps {
  owner: string;
  highlighted: boolean;
  onVote: (witness: string, approve: boolean) => void;
  voteEnabled: boolean;
  isVoted: boolean;
  voteLoading: boolean;
}

const VOTE_FOCUS_RING =
  'rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2';

/** A witness row's vote toggle: votes, asks before removing a vote, or opens the login dialog when signed out. */
export default function WitnessVoteButton({
  owner,
  highlighted,
  onVote,
  voteEnabled,
  isVoted,
  voteLoading
}: WitnessVoteButtonProps) {
  const { t } = useTranslation('common_wallet');
  const onVoteForWitness = (approve: boolean) => onVote(owner, approve);

  const [removeVoteOpen, setRemoveVoteOpen] = useState(false);
  const onVoteClick = () => (isVoted ? setRemoveVoteOpen(true) : onVoteForWitness(true));
  const voteLabel = t('witnesses_page.vote_for_witness', { witness: owner });
  const unvotedIcon = (
    <Icons.arrowUpCircle
      viewBox="1.7 1.7 20.7 20.7"
      className={clsx(
        'relative inline-flex h-5 w-5 cursor-pointer rounded-full stroke-1 text-red-600 dark:text-red-500',
        {
          'bg-slate-100 dark:bg-slate-900': !highlighted,
          'bg-rose-200  dark:bg-rose-800': highlighted
        }
      )}
    />
  );

  if (!voteEnabled)
    return (
      <DialogLogin>
        <button
          type="button"
          title={t('witnesses_page.vote')}
          aria-label={voteLabel}
          className={clsx('group relative flex', VOTE_FOCUS_RING)}
          data-testid="witness-vote"
        >
          <span className="opocity-75 absolute inline-flex h-5 w-5 rounded-full bg-red-600 p-0 group-hover:animate-ping dark:bg-red-400"></span>
          {unvotedIcon}
        </button>
      </DialogLogin>
    );

  return (
    <div title={t('witnesses_page.vote')} className="group relative flex" data-testid="witness-vote">
      <span className="opocity-75 absolute inline-flex h-5 w-5 rounded-full bg-red-600 p-0 group-hover:animate-ping dark:bg-red-400"></span>
      <button
        type="button"
        aria-label={voteLabel}
        aria-pressed={isVoted}
        aria-busy={voteLoading}
        className={clsx('relative flex', VOTE_FOCUS_RING)}
        onClick={voteLoading ? undefined : onVoteClick}
      >
        {voteLoading ? (
          <span className="relative rounded-full bg-white dark:bg-slate-900">
            <CircleSpinner loading={voteLoading} size={20} color="#dc2626" />
          </span>
        ) : isVoted ? (
          <Icons.arrowUpCircle className="relative inline-flex h-5 w-5 cursor-pointer rounded-full bg-rose-600 stroke-1 text-white dark:bg-rose-600 dark:text-white" />
        ) : (
          unvotedIcon
        )}
      </button>
      <WitnessRemoveVote open={removeVoteOpen} onOpenChange={setRemoveVoteOpen} onVote={onVoteForWitness} />
    </div>
  );
}
