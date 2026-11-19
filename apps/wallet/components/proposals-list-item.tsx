import type { ReactNode } from 'react';
import { Link } from '@hive/ui';
import { BURN_ACCOUNTS, REFUND_ACCOUNTS } from '@/wallet/lib/constants';
import { IListItemProps } from '@/wallet/lib/hive';
import { formatDecimal, getRoundedAbbreveration } from '@hive/ui/lib/utils';
import { isRefundProposal, remainingDays } from '@/wallet/lib/proposals-list';
import dayjs from 'dayjs';
import { Badge } from '@ui/components/badge';
import { ProposalVotesButton } from './proposal-votes-button';
import { ProposalVoteControl } from './proposal-vote-control';
import { ProposalFundingBadge } from './proposal-funding-badge';
import { ProposalPaidAmounts } from './proposal-paid-amounts';
import { PhoneOrDesktopText } from './phone-or-desktop-text';
import { DOTTED_ITEM_CLASS, DOTTED_ROW_CLASS } from './dotted-row';
import { useTranslation, Trans } from '@/wallet/i18n/client';
import env from '@beam-australia/react-env';
import TimeAgo from '@ui/components/time-ago';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { getUserAvatarUrl, UserAvatarImg } from '@hive/ui';
import { useLocale } from '@ui/components/locale-context';

const STATUS_TOOLTIP_KEYS: Record<string, string> = {
  active: 'proposals_page.status_tooltip_started',
  inactive: 'proposals_page.status_tooltip_not_started',
  expired: 'proposals_page.status_tooltip_finished'
};

// An active proposal, nearly every one listed, shows no badge: only the unusual states do
const STATUS_LABEL_KEYS: Record<string, string> = {
  inactive: 'proposals_page.not_started',
  expired: 'proposals_page.finished'
};

const LINK_CLASS = 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300';

const TitleSetter = ({ start, end, status }: { start: string; end: string; status: string }) => {
  const i18nKey = STATUS_TOOLTIP_KEYS[status];
  if (!i18nKey) return <div></div>;
  return (
    <div>
      <Trans i18nKey={i18nKey} components={{ start: <TimeAgo date={start} />, end: <TimeAgo date={end} /> }} />
    </div>
  );
};

/** `trigger`, with the tooltip saying when the proposal starts and finishes. */
const StatusTooltip = ({
  proposal,
  trigger
}: {
  proposal: IListItemProps['proposalData'];
  trigger: ReactNode;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger type="button">{trigger}</TooltipTrigger>
      <TooltipContent>
        <TitleSetter start={proposal.start_date} end={proposal.end_date} status={proposal.status} />
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// The full month name: with a day, a locale writes it in its date form (Polish "15 maja"), which the
// abbreviation does not always give ("15 maj")
const PROPOSAL_DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

/**
 * A proposal in three lines: its title and badges; who it is by, its daily pay, dates and the days
 * left; and its money (see ProposalPaidAmounts). Its vote total and vote button sit on the right.
 */
export function ProposalListItem({
  proposalData,
  totalShares,
  totalVestingFund,
  voted,
  funding,
  isReturnProposal,
  paid
}: IListItemProps) {
  const { t } = useTranslation('common_wallet');
  const { locale } = useLocale();
  const dateFormat = new Intl.DateTimeFormat(locale, PROPOSAL_DATE_FORMAT);

  const totalDays = dayjs(proposalData.end_date).diff(dayjs(proposalData.start_date), 'day');
  const totalHBD = proposalData.daily_pay.amount.times(totalDays);
  const now = Date.now();
  const daysLeft = proposalData.status === 'active' ? remainingDays(proposalData.end_date, now) : null;
  const daysToStart =
    proposalData.status === 'inactive' ? Math.max(1, remainingDays(proposalData.start_date, now)) : null;
  const postPath = `@${proposalData.creator}/${proposalData.permlink}`;
  const dateRange = `${dateFormat.format(dayjs(proposalData.start_date).toDate())} – ${dateFormat.format(
    dayjs(proposalData.end_date).toDate()
  )}`;
  const statusLabelKey = STATUS_LABEL_KEYS[proposalData.status];
  const totalVotes = totalVestingFund.times(proposalData.total_votes).div(totalShares).times(0.000001);
  const timing =
    daysLeft !== null
      ? {
          phone: t('proposals_page.remaining_days_short', { days: daysLeft }),
          desktop: t('proposals_page.remaining_days', { count: daysLeft })
        }
      : daysToStart !== null
        ? {
            phone: t('proposals_page.starts_in', {
              duration: t('proposals_page.duration_days_short', { days: daysToStart })
            }),
            desktop: t('proposals_page.starts_in', {
              duration: t('proposals_page.duration_days', { count: daysToStart })
            })
          }
        : null;

  function getFundingType() {
    if (isRefundProposal(proposalData, REFUND_ACCOUNTS))
      return <Badge variant="lime">{t('proposals_page.refund')}</Badge>;

    if (BURN_ACCOUNTS.includes(proposalData.receiver))
      return <Badge variant="orange">{t('proposals_page.burn')}</Badge>;

    return null;
  }

  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-b border-slate-200 py-2 dark:border-slate-700"
      data-testid="proposal-list-item"
      data-proposal-id={proposalData.proposal_id}
    >
      <div className="col-span-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 sm:col-span-1">
        <Link
          href={`${env('BLOG_DOMAIN')}/${postPath}`}
          target="_blank"
          rel="noopener noreferrer"
          title={`${postPath}\n${proposalData.subject}\n${dateRange}`}
          className="flex min-w-0 sm:inline"
          data-testid="proposal-post-link"
        >
          {/* On a phone the title takes one line, cut short before its id; the link's title has it whole */}
          <span
            className={`${LINK_CLASS} flex min-w-0 font-medium sm:inline sm:text-base`}
            data-testid="proposal-title"
          >
            <span className="truncate sm:whitespace-normal">{proposalData.subject}</span>
            <span
              className="shrink-0 whitespace-pre text-slate-600 dark:text-slate-400 sm:whitespace-normal"
              data-testid="proposal-id"
            >
              {' #'}
              {proposalData.proposal_id}
            </span>
          </span>
        </Link>
        {statusLabelKey ? (
          <StatusTooltip
            proposal={proposalData}
            trigger={
              <Badge variant="red" data-testid="proposal-status-badge">
                {t(statusLabelKey)}
              </Badge>
            }
          />
        ) : null}
        {getFundingType()}
        {funding ? <ProposalFundingBadge funding={funding} /> : null}
      </div>

      <div
        className={`${DOTTED_ROW_CLASS} min-w-0 text-xs text-slate-600 dark:text-slate-400 sm:text-sm`}
        data-testid="proposal-details"
      >
        <span className="flex min-w-0 items-center gap-x-1.5">
          <Link
            href={`${env('BLOG_DOMAIN')}/@${proposalData.creator}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden shrink-0 sm:block"
          >
            <UserAvatarImg
              className="h-6 w-6 rounded-3xl"
              height="24"
              width="24"
              src={getUserAvatarUrl(proposalData.creator, 'small')}
              alt={`${proposalData.creator} profile picture`}
            />
          </Link>
          {/* The author is never cut short: the figures after it wrap onto another line instead */}
          <span className="min-w-0 break-words" data-testid="proposal-author">
            {t('proposals_page.by')}{' '}
            <Link href={`${env('BLOG_DOMAIN')}/@${proposalData.creator}`} target="_blank" rel="noopener noreferrer">
              <span className={LINK_CLASS} data-testid="proposal-creator">
                {proposalData.creator}
              </span>
            </Link>
            {proposalData.receiver !== proposalData.creator ? (
              <>
                {t('proposals_page.for')}
                <Link
                  href={`${env('BLOG_DOMAIN')}/@${proposalData.receiver}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={LINK_CLASS} data-testid="proposal-receiver">
                    {proposalData.receiver}
                  </span>
                </Link>
              </>
            ) : null}
          </span>
        </span>
        <span
          className={`${DOTTED_ITEM_CLASS} whitespace-nowrap`}
          title={formatDecimal(proposalData.daily_pay.amount, 2, locale) + ' HBD'}
          data-testid="proposal-amount"
        >
          {t('proposals_page.per_day', { amount: getRoundedAbbreveration(proposalData.daily_pay.amount, locale) })}
        </span>
        <span className={`${DOTTED_ITEM_CLASS} hidden whitespace-nowrap sm:inline`} data-testid="proposal-date">
          {dateRange}
        </span>
        {timing ? (
          <span className={DOTTED_ITEM_CLASS}>
            <StatusTooltip
              proposal={proposalData}
              trigger={
                <PhoneOrDesktopText
                  phone={timing.phone}
                  desktop={timing.desktop}
                  testId={daysLeft !== null ? 'proposal-remaining-days' : 'proposal-starts-in'}
                />
              }
            />
          </span>
        ) : null}
      </div>

      <div className="col-span-2 sm:col-span-1">
        {isReturnProposal ? (
          <p className="text-xs italic text-slate-600 dark:text-slate-300" data-testid="proposal-return-note">
            {t('proposals_page.return_proposal_note')}
          </p>
        ) : (
          <ProposalPaidAmounts proposal={proposalData} total={totalHBD} totalDays={totalDays} paid={paid} />
        )}
      </div>

      <div className="col-start-2 row-start-2 flex items-start gap-2 self-start sm:row-span-3 sm:row-start-1">
        <ProposalVotesButton
          proposalId={proposalData.id}
          totalVotesHp={totalVotes}
          totalShares={totalShares}
          totalVestingFund={totalVestingFund}
        />
        <ProposalVoteControl proposalId={proposalData.proposal_id} status={proposalData.status} voted={voted} />
      </div>
    </div>
  );
}
