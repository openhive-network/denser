import Big from 'big.js';
import { Icons } from '@hive/ui/components/icons';
import { getRoundedAbbreveration, numberWithCommas } from '@hive/ui/lib/utils';
import { useTranslation } from '@/wallet/i18n/client';
import VoteProposals from './votes-proposals-dialog';

interface ProposalVotesButtonProps {
  proposalId: number;
  /** The HP the proposal's voters back it with. */
  totalVotesHp: Big;
  totalShares: Big;
  totalVestingFund: Big;
}

/** A proposal's vote total, in HP, as the button that opens its list of voters. */
export function ProposalVotesButton({
  proposalId,
  totalVotesHp,
  totalShares,
  totalVestingFund
}: ProposalVotesButtonProps) {
  const { t } = useTranslation('common_wallet');
  const amount = `${getRoundedAbbreveration(totalVotesHp)} HP`;

  return (
    <VoteProposals
      id={proposalId}
      totalShares={totalShares}
      totalVestingFund={totalVestingFund}
      tooltip={t('proposals_page.show_voters_tooltip', { amount: numberWithCommas(totalVotesHp.toFixed(2)) })}
    >
      <button
        type="button"
        aria-label={t('proposals_page.show_voters_label', { amount, id: proposalId })}
        className="group flex flex-col items-center gap-0.5 self-center rounded-md px-1 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:ring-offset-slate-800"
        data-testid="vote-proposals-dialog-trigger"
      >
        <span className="whitespace-nowrap md:text-xl" data-testid="vote-proposal-value">
          {amount}
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
          <Icons.list className="h-3.5 w-3.5" aria-hidden="true" />
          {t('proposals_page.voters_list')}
        </span>
      </button>
    </VoteProposals>
  );
}
