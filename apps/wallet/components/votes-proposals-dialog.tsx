import { Dialog, DialogTrigger } from '@ui/components/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import Loading from '@ui/components/loading';
import dynamic from 'next/dynamic';
import { ReactElement, ReactNode, useMemo } from 'react';
import { useTranslation } from '@/wallet/i18n/client';
import VotersDialogContent from './voters-dialog-content';

// Loaded when the dialog opens: the proposals page's own load carries none of it.
const ProposalVoters = dynamic(() => import('./proposal-voters'), { ssr: false, loading: () => <Loading loading /> });

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
  const totals = useMemo(
    () => ({ vestingFundHive: totalVestingFund, vestingShares: totalShares }),
    [totalVestingFund, totalShares]
  );

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
      <VotersDialogContent
        data-testid="vote-proposals-dialog"
        title={
          <>
            {t('proposals_page.votes_on_proposal')}{' '}
            <span className="text-red-500 dark:text-red-400" data-testid="proposal-id-dialog">
              #{id}
            </span>
          </>
        }
      >
        <ProposalVoters id={id} totals={totals} />
      </VotersDialogContent>
    </Dialog>
  );
}
export default VoteProposals;
