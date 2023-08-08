import Link from "next/link";
import { BURN_ACCOUNTS, REFUND_ACCOUNTS } from "@/wallet/lib/constants";
import { ListItemProps } from "@/wallet/lib/hive";
import { getRoundedAbbreveration, numberWithCommas } from "@hive/ui/lib/utils";
import { Icons } from "@hive/ui/components/icons";
import moment from "moment";
import { dateToFullRelative } from "@hive/ui/lib/parse-date";
import { Badge } from "@hive/ui/components/badge";
import { useEffect, useState } from "react";
import { getPostHeader } from "@hive/ui/lib/bridge";

function titleSetter(daysStart: string, datsEnd: string, status: string) {
  switch (status) {
    case "started":
      return `Started ${dateToFullRelative(
        daysStart
      )} and finish ${dateToFullRelative(datsEnd)}`;
    case "not started":
      return `Start ${dateToFullRelative(
        daysStart
      )} and finish ${dateToFullRelative(datsEnd)}`;
    case `finished`:
      return `Finished ${dateToFullRelative(datsEnd)}`;
    default:
      return "";
  }
}
export function ProposalListItem({
  proposalData,
  totalShares,
  totalVestingFund,
}: ListItemProps) {
  const [link, setLink] = useState<string>(
    `http://localhost:3000/${proposalData.creator}/${proposalData.permlink}`
  );
  const totalHBD = proposalData.daily_pay.amount.times(
    moment(proposalData.end_date).diff(moment(proposalData.start_date), "d")
  );
  const totalDays = moment(proposalData.end_date).diff(
    proposalData.start_date,
    `d`
  );
  const totalVotes = totalVestingFund
    .times(proposalData.total_votes)
    .div(totalShares)
    .times(0.000001);

  useEffect(() => {
    getPostHeader(proposalData.creator, String(proposalData.permlink)).then(
      (res) => {
        setLink(
          `http://localhost:3000/${res.category}/@${res.author}/${res.permlink}`
        );
      }
    );
  }, []);

  function getFundingType() {
    if (REFUND_ACCOUNTS.includes(proposalData.receiver))
      return <Badge variant="lime">refund</Badge>;

    if (BURN_ACCOUNTS.includes(proposalData.receiver))
      return <Badge variant="orange">burn</Badge>;

    return null;
  }
  return (
    <div className="flex flex-col justify-between bg-white p-2.5 drop-shadow-xl dark:bg-slate-800 sm:flex-row ">
      <div className="w-3/4">
        <Link
          href={link}
          target="_blank"
          title={titleSetter(
            proposalData.start_date,
            proposalData.end_date,
            proposalData.status
          )}
        >
          <span className="text-red-500 hover:text-red-300 dark:hover:text-red-400 md:text-lg">
            {proposalData.subject}
            <span className="text-slate-500">
              {" #"}
              {proposalData.proposal_id}
            </span>
          </span>
        </Link>
        <div className="flex flex w-fit flex-col gap-3 py-3 text-xs min-[900px]:flex-row min-[900px]:items-center">
          <span className="whitespace-nowrap text-slate-500">
            {proposalData.start_date}
            {" - "}
            {proposalData.end_date} {"("}
            {totalDays}
            {" days)"}
          </span>
          <div className="whitespace-nowrap text-slate-500">
            <span
              title={numberWithCommas(totalHBD.toFixed(2)) + " HBD"}
              className="font-semibold text-red-500 dark:text-red-200"
            >
              {getRoundedAbbreveration(totalHBD)} {" HBD"}
            </span>{" "}
            {"(Daily "}
            {getRoundedAbbreveration(proposalData.daily_pay.amount)}
            {" HBD)"}
          </div>
          <div className="flex gap-2">
            <span
              title={titleSetter(
                proposalData.start_date,
                proposalData.end_date,
                proposalData.status
              )}
            >
              <Badge variant="red">{proposalData.status}</Badge>
            </span>
            {getFundingType()}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs md:text-sm">
          <Link
            href={`http://localhost:3000/@${proposalData.creator}`}
            target="_blank"
          >
            <img
              className="h-[30px] w-[30px] rounded-3xl"
              height="40"
              width="40"
              src={`https://images.hive.blog/u/${proposalData.creator}/avatar`}
              alt={`${proposalData.creator} profile picture`}
            />
          </Link>
          by
          <Link
            href={`http://localhost:3000/@${proposalData.creator}`}
            target="_blank"
          >
            <span className="text-red-500 dark:hover:text-red-400">
              {proposalData.creator}
            </span>
          </Link>
          {proposalData.receiver !== proposalData.creator && (
            <span>
              {" for "}
              <Link
                href={`http://localhost:3000/@${proposalData.receiver}`}
                target="_blank"
              >
                <span className="text-red-500 dark:hover:text-red-400">
                  {proposalData.receiver}
                </span>
              </Link>
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-between sm:justify-around border-t-2 border-slate-300 p-2  dark:border-slate-600 sm:ml-2 sm:w-32 sm:w-32 sm:flex-col sm:items-center sm:border-l-2 sm:border-t-0 sm:pl-4">
        <div
          className="self-center md:text-xl cursor-pointer"
          title={numberWithCommas(totalVotes.toFixed(2)) + " HP"}
        >
          {getRoundedAbbreveration(totalVotes)}
        </div>
        <div className="group relative flex">
          <span className="opocity-75 absolute inline-flex h-6 w-6 rounded-full bg-red-500 p-0 group-hover:animate-ping dark:bg-red-400"></span>
          <Icons.arrowUpCircle
            viewBox="1.7 1.7 20.7 20.7"
            className="relative inline-flex h-6 w-6 rounded-full bg-white stroke-1 text-red-500 dark:bg-slate-800 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
