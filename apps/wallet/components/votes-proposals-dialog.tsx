import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@ui/components/dialog';
import { ReactNode } from 'react';
import { useTranslation } from '@/wallet/i18n/client';
import VotersList from './voters-list';

function VoteProposals({
  children,
  id,
  totalShares,
  totalVestingFund
}: {
  children: ReactNode;
  id: number;
  totalShares: Big;
  totalVestingFund: Big;
}) {
  const { t } = useTranslation('common_wallet');

  return (
    <Dialog>
      <DialogTrigger data-testid="vote-proposals-dialog-trigger">{children}</DialogTrigger>
      <DialogContent
        className="sm:max-w-2/3 h-5/6 gap-3 overflow-auto px-3 pt-3"
        data-testid="vote-proposals-dialog"
        aria-modal="true"
        aria-describedby={undefined}
      >
        <DialogTitle className="h-fit border-b-2 border-solid border-slate-600 pb-2 text-base font-normal leading-normal tracking-normal">
          {t('proposals_page.votes_on_proposal')}{' '}
          <span className="text-red-500" data-testid="proposal-id-dialog">
            #{id}
          </span>
        </DialogTitle>
        <VotersList id={id} totalShares={totalShares} totalVestingFund={totalVestingFund} />
      </DialogContent>
    </Dialog>
  );
}
export default VoteProposals;
