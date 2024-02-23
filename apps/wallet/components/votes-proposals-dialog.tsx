import { Dialog, DialogContent, DialogTrigger } from '@ui/components/dialog';
import { ReactNode } from 'react';
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
  return (
    <Dialog>
      <DialogTrigger data-testid="vote-proposals-dialog-trigger">{children}</DialogTrigger>
      <DialogContent
        className="sm:max-w-2/3 h-5/6 gap-3 overflow-auto px-3 pt-3"
        data-testid="vote-proposals-dialog"
      >
        <div className="h-fit border-b-2 border-solid border-slate-600 pb-2">
          Votes on proposal{' '}
          <span className="text-red-500" data-testid="proposal-id-dialog">
            #{id}
          </span>
        </div>
        <VotersList id={id} totalShares={totalShares} totalVestingFund={totalVestingFund} />
      </DialogContent>
    </Dialog>
  );
}
export default VoteProposals;
