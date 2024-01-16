import Link from 'next/link';
import { BURN_ACCOUNTS, REFUND_ACCOUNTS } from '@/wallet/lib/constants';
import { ListItemProps } from '@/wallet/lib/hive';
import { getRoundedAbbreveration, numberWithCommas } from '@hive/ui/lib/utils';
import { Icons } from '@hive/ui/components/icons';
import moment from 'moment';
import { dateToFullRelative } from '@hive/ui/lib/parse-date';
import { Badge } from '@hive/ui/components/badge';
import { useEffect, useState } from 'react';
import { getPostHeader } from '@hive/ui/lib/bridge';
import VoteProposals from './votes-proposals-dialog';
import DialogLogin from './dialog-login';
import { useTranslation } from 'next-i18next';
import { TFunction } from 'i18next';

function titleSetter(
  daysStart: string,
  datsEnd: string,
  status: string,
  t: TFunction<'common_wallet', undefined>
) {
  switch (status) {
    case 'started':
      return `Started ${dateToFullRelative(daysStart, t)} and finish ${dateToFullRelative(datsEnd, t)}`;
    case 'not started':
      return `Start ${dateToFullRelative(daysStart, t)} and finish ${dateToFullRelative(datsEnd, t)}`;
    case `finished`:
      return `Finished ${dateToFullRelative(datsEnd, t)}`;
    default:
      return '';
  }
}
function translateShorDate(data: string, t: TFunction<'common_wallet', undefined>) {
  const dd = data
    .replace('Jan', t('global.months_short_form.first'))
    .replace('Feb', t('global.months_short_form.second'))
    .replace('Mar', t('global.months_short_form.third'))
    .replace('Apr', t('global.months_short_form.fourth'))
    .replace('May', t('global.months_short_form.fifth'))
    .replace('Jun', t('global.months_short_form.sixth'))
    .replace('Jul', t('global.months_short_form.seventh'))
    .replace('Aug', t('global.months_short_form.eighth'))
    .replace('Sep', t('global.months_short_form.ninth'))
    .replace('Oct', t('global.months_short_form.tenth'))
    .replace('Nov', t('global.months_short_form.eleventh'))
    .replace('Dec', t('global.months_short_form.twelfth'));
  return dd;
}

export function ProposalListItem({ proposalData, totalShares, totalVestingFund }: ListItemProps) {
  const { t } = useTranslation('common_wallet');
  const [link, setLink] = useState<string>(`/${proposalData.creator}/${proposalData.permlink}`);
  const totalHBD = proposalData.daily_pay.amount.times(
    moment(proposalData.end_date).diff(moment(proposalData.start_date), 'd')
  );
  const totalDays = moment(proposalData.end_date).diff(proposalData.start_date, `d`);

  const totalVotes = totalVestingFund.times(proposalData.total_votes).div(totalShares).times(0.000001);

  useEffect(() => {
    getPostHeader(proposalData.creator, String(proposalData.permlink)).then((res) => {
      setLink(`/${res.category}/@${res.author}/${res.permlink}`);
    });
  }, [proposalData.creator, proposalData.permlink]);

  function getFundingType() {
    if (REFUND_ACCOUNTS.includes(proposalData.receiver))
      return <Badge variant="lime">{t('proposals_page.refund')}</Badge>;

    if (BURN_ACCOUNTS.includes(proposalData.receiver))
      return <Badge variant="orange">{t('proposals_page.burn')}</Badge>;

    return null;
  }

  return (
    <div
      className="flex flex-col justify-between bg-white p-2.5 drop-shadow-xl dark:bg-slate-800 sm:flex-row "
      data-testid="proposal-list-item"
    >
      <div className="w-3/4">
        <Link
          href={link}
          target="_blank"
          title={titleSetter(proposalData.start_date, proposalData.end_date, proposalData.status, t)}
        >
          <span
            className="text-red-500 hover:text-red-300 dark:hover:text-red-400 md:text-lg"
            data-testid="proposal-title"
          >
            {proposalData.subject}
            <span className="text-slate-500" data-testid="proposal-id">
              {' #'}
              {proposalData.proposal_id}
            </span>
          </span>
        </Link>
        <div className="flex w-fit flex-col gap-3 py-3 text-xs min-[900px]:flex-row min-[900px]:items-center">
          <span className="whitespace-nowrap text-slate-500" data-testid="proposal-date">
            {translateShorDate(proposalData.start_date, t)}
            {' - '}
            {translateShorDate(proposalData.end_date, t)} {'('}
            {totalDays !== 1 ? totalDays + t('global.time.days') : t('global.time.a_day')}
            {')'}
          </span>
          <div className="whitespace-nowrap text-slate-500" data-testid="proposal-amount">
            <span
              title={numberWithCommas(totalHBD.toFixed(2)) + ' HBD'}
              className="font-semibold text-red-500 dark:text-red-200"
            >
              {getRoundedAbbreveration(totalHBD)} {' HBD'}
            </span>{' '}
            {'('}
            {t('proposals_page.daily')} {getRoundedAbbreveration(proposalData.daily_pay.amount)}
            {' HBD)'}
          </div>
          <div className="flex gap-2">
            <span title={titleSetter(proposalData.start_date, proposalData.end_date, proposalData.status, t)}>
              <Badge variant="red" data-testid="proposal-status-badge">
                {proposalData.status}
              </Badge>
            </span>
            {getFundingType()}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs md:text-sm">
          <Link href={`/@${proposalData.creator}`} target="_blank">
            <img
              className="h-[30px] w-[30px] rounded-3xl"
              height="40"
              width="40"
              src={`https://images.hive.blog/u/${proposalData.creator}/avatar`}
              alt={`${proposalData.creator} profile picture`}
            />
          </Link>
          {t('proposals_page.by')}
          <Link href={`/@${proposalData.creator}`} target="_blank">
            <span className="text-red-500 dark:hover:text-red-400" data-testid="proposal-creator">
              {proposalData.creator}
            </span>
          </Link>
          {proposalData.receiver !== proposalData.creator && (
            <span>
              {t('proposals_page.for')}
              <Link href={`/</span>@${proposalData.receiver}`} target="_blank">
                <span className="text-red-500 dark:hover:text-red-400" data-testid="proposal-receiver">
                  {proposalData.receiver}
                </span>
              </Link>
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-between border-t-2 border-slate-300 p-2  dark:border-slate-600 sm:ml-2 sm:w-32 sm:flex-col sm:items-center sm:border-l-2 sm:border-t-0 sm:pl-4">
        <VoteProposals id={proposalData.id} totalShares={totalShares} totalVestingFund={totalVestingFund}>
          <div
            className="self-center md:text-xl"
            title={totalVotes.toFixed(2) + ' HP'}
            data-testid="vote-proposal-value"
          >
            {getRoundedAbbreveration(totalVotes)}
          </div>
        </VoteProposals>

        <DialogLogin>
          <div className="group relative flex">
            <span className="opocity-75 absolute inline-flex h-6 w-6 rounded-full bg-red-500 p-0 group-hover:animate-ping dark:bg-red-400"></span>
            <Icons.arrowUpCircle
              viewBox="1.7 1.7 20.7 20.7"
              className="relative inline-flex h-6 w-6 cursor-pointer rounded-full bg-white stroke-1 text-red-500 dark:bg-slate-800"
              data-testid="voting-button-icon"
            />
          </div>
        </DialogLogin>
      </div>
    </div>
  );
}
