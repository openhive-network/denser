import Link from 'next/link';
import { BURN_ACCOUNTS, REFUND_ACCOUNTS } from '@/lib/constants';
import { ListItemProps } from '@/lib/hive';
import { getRoundedAbbreveration } from '@/lib/utils';
import { Icons } from './icons';
import moment from 'moment';
import { dateToFullRelative } from '@/lib/parse-date';
import { useEffect, useState } from 'react';
import { getPostHeader } from '@/lib/bridge';
import permlink from '@/pages/[param]/[p2]/[permlink]';

function titleSetter(daysStart: string, datsEnd: string, status: string) {
  switch (status) {
    case 'started':
      return `Started ${dateToFullRelative(daysStart)} and finish ${dateToFullRelative(datsEnd)}`;
    case 'not started':
      return `Start ${dateToFullRelative(daysStart)} and finish ${dateToFullRelative(datsEnd)}`;
    case `finished`:
      return `Finished ${dateToFullRelative(datsEnd)}`;
    default:
      return '';
  }
}
export function ProposalListItem({ proposalData, totalShares, totalVestingFund }: ListItemProps) {
  const [link, setLink] = useState<string>(`${proposalData.creator}/${proposalData.permlink}`);
  const totalHBD = proposalData.daily_pay.amount.times(
    moment(proposalData.end_date).diff(moment(proposalData.start_date), 'd')
  );
  const totalDays = moment(proposalData.end_date).diff(proposalData.start_date, `d`);
  const totalVotes = totalVestingFund.times(proposalData.total_votes).div(totalShares).times(0.000001);

  useEffect(() => {
    getPostHeader(proposalData.creator, String(proposalData.permlink)).then((res) => {
      setLink(`${res.category}/@${res.author}/${res.permlink}`);
    });
  }, []);

  function getFundingType() {
    if (REFUND_ACCOUNTS.includes(proposalData.receiver))
      return (
        <span className="h-fit w-fit w-min rounded-md border-2 border-lime-700 px-1 text-lime-700 ">
          refund
        </span>
      );

    if (BURN_ACCOUNTS.includes(proposalData.receiver))
      return (
        <span className="h-fit w-fit w-min rounded-md border-2 border-orange-600 px-1 text-orange-600 ">
          burn
        </span>
      );

    return null;
  }
  return (
    <div className="flex flex-col justify-between bg-white p-2.5 drop-shadow-xl dark:bg-slate-800 sm:flex-row ">
      <div className="w-3/4">
        <Link href={link}>
          <span className="font-medium text-red-600 hover:text-red-300 dark:text-blue-500 dark:hover:text-blue-400 md:text-xl">
            {proposalData.subject}
            <span className="font-semibold text-slate-500">
              {' #'}
              {proposalData.proposal_id}
            </span>
          </span>
        </Link>
        <div className="flex flex w-fit flex-col gap-3 py-3 text-xs md:text-sm min-[900px]:flex-row lg:items-center">
          <span className="whitespace-nowrap text-slate-500">
            {proposalData.start_date}
            {' - '}
            {proposalData.end_date} {'('}
            {totalDays}
            {' days)'}
          </span>
          <div className="whitespace-nowrap text-slate-500">
            <span className="font-semibold text-red-600 dark:text-blue-200">
              {getRoundedAbbreveration(totalHBD)} {' HBD'}
            </span>{' '}
            {'(Daily '}
            {getRoundedAbbreveration(proposalData.daily_pay.amount)}
            {' HBD)'}
          </div>
          <div className="flex gap-2">
            <span
              title={titleSetter(proposalData.start_date, proposalData.end_date, proposalData.status)}
              className="h-fit w-fit w-min  whitespace-nowrap rounded-md border-2 border-red-600 px-1 text-red-600 dark:border-blue-200 dark:text-blue-200"
            >
              {proposalData.status}
            </span>
            {getFundingType()}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs md:text-sm">
          <Link href={`@${proposalData.creator}`}>
            <img
              className="h-[30px] w-[30px] rounded-3xl"
              height="40"
              width="40"
              src={`https://images.hive.blog/u/${proposalData.creator}/avatar`}
              alt={`${proposalData.creator} profile picture`}
            />
          </Link>
          by
          <Link href={`@${proposalData.creator}`}>
            <span className="text-red-600 dark:text-blue-500 dark:hover:text-blue-400">
              {proposalData.creator}
            </span>
          </Link>
          {proposalData.receiver !== proposalData.creator && (
            <span>
              {' for '}
              <Link href={`@${proposalData.receiver}`}>
                <span className="text-red-600 dark:text-blue-500 dark:hover:text-blue-400">
                  {proposalData.receiver}
                </span>
              </Link>
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-between border-t-2 border-slate-300 p-2  dark:border-slate-600 sm:ml-2 sm:w-32 sm:w-32 sm:flex-col sm:items-center sm:border-l-2 sm:border-t-0 sm:pl-4">
        <div className="self-center md:text-xl">{getRoundedAbbreveration(totalVotes)}</div>
        <div className="group relative flex">
          <span className="opocity-75 absolute inline-flex h-6 w-6 rounded-full bg-red-600 p-0 group-hover:animate-ping group-hover:[animation-iteration-count:_1] dark:bg-blue-400 sm:h-8 sm:w-8"></span>
          <Icons.arrowUpCircle
            viewBox="1.7 1.7 20.7 20.7"
            className="relative inline-flex h-6 w-6 rounded-full bg-white stroke-1 text-red-600 dark:bg-slate-800 dark:text-blue-500 sm:h-8 sm:w-8"
          />
        </div>
      </div>
    </div>
  );
}
