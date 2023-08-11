import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@hive/ui/components/dialog";
import { ReactNode } from "react";
import VotersList from "./voters-list";

function VoteProposals({
  children,
  id,
  totalShares,
  totalVestingFund,
}: {
  children: ReactNode;
  id: number;
  totalShares: Big;
  totalVestingFund: Big;
}) {
  return (
    <Dialog>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2/3 h-5/6 overflow-auto px-3 pt-3 gap-3">
        <div className="border-b-2 border-solid border-slate-600 pb-2 h-fit">
          Votes on proposal <span className="text-red-500">#{id}</span>
        </div>
        <VotersList
          id={id}
          totalShares={totalShares}
          totalVestingFund={totalVestingFund}
        />
      </DialogContent>
    </Dialog>
  );
}
export default VoteProposals;
