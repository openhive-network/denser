import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@ui/components/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { ReactElement, ReactNode } from 'react';
import { useTranslation } from '@/wallet/i18n/client';
import VotersList from './voters-list';

/** The voters dialog of proposal `id`, opened by `children`, a button, which shows `tooltip` on hover and focus. */
function VoteProposals({
  children,
  tooltip,
  id,
  totalShares,
  totalVestingFund
}: {
  children: ReactElement;
  tooltip: ReactNode;
  id: number;
  totalShares: Big;
  totalVestingFund: Big;
}) {
  const { t } = useTranslation('common_wallet');

  return (
    <Dialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>{children}</DialogTrigger>
          </TooltipTrigger>
          <TooltipContent data-testid="vote-proposal-value-tooltip">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent
        className="sm:max-w-2/3 h-5/6 gap-3 overflow-auto px-3 pt-3"
        data-testid="vote-proposals-dialog"
        aria-modal="true"
        aria-describedby={undefined}
      >
        <DialogTitle className="h-fit border-b-2 border-solid border-slate-600 pb-2 text-base font-normal leading-normal tracking-normal">
          {t('proposals_page.votes_on_proposal')}{' '}
          <span className="text-red-500 dark:text-red-400" data-testid="proposal-id-dialog">
            #{id}
          </span>
        </DialogTitle>
        <VotersList id={id} totalShares={totalShares} totalVestingFund={totalVestingFund} />
      </DialogContent>
    </Dialog>
  );
}
export default VoteProposals;
