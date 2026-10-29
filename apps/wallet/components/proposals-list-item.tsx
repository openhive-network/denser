import { Link } from '@hive/ui';
import { BURN_ACCOUNTS, REFUND_ACCOUNTS } from '@/wallet/lib/constants';
import { IListItemProps } from '@/wallet/lib/hive';
import { cn, getRoundedAbbreveration, numberWithCommas } from '@hive/ui/lib/utils';
import { isRefundProposal, remainingDays } from '@/wallet/lib/proposals-list';
import { Icons } from '@hive/ui/components/icons';
import dayjs from 'dayjs';
import { Badge } from '@ui/components/badge';
import { ProposalVotesButton } from './proposal-votes-button';
import { ProposalFundingBadge } from './proposal-funding-badge';
import { ProposalPaidAmounts } from './proposal-paid-amounts';
import { useTranslation, Trans } from '@/wallet/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import DialogLogin from './dialog-login';
import { useUpdateProposalVotesMutation } from '@hive/wallet/components/hooks/use-update-proposal-votes-mutation';
import env from '@beam-australia/react-env';
import { useEffect, useState } from 'react';
import { handleError } from '@ui/lib/handle-error';
import TimeAgo from '@ui/components/time-ago';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { getUserAvatarUrl, UserAvatarImg } from '@hive/ui';
import { useLocale } from '@ui/components/locale-context';

const VOTE_FOCUS_RING =
  'rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2';

const STATUS_TOOLTIP_KEYS: Record<string, string> = {
  active: 'proposals_page.status_tooltip_started',
  inactive: 'proposals_page.status_tooltip_not_started',
  expired: 'proposals_page.status_tooltip_finished'
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  active: 'proposals_page.started',
  inactive: 'proposals_page.not_started',
  expired: 'proposals_page.finished'
};

const TitleSetter = ({ start, end, status }: { start: string; end: string; status: string }) => {
  const i18nKey = STATUS_TOOLTIP_KEYS[status];
  if (!i18nKey) return <div></div>;
  return (
    <div>
      <Trans i18nKey={i18nKey} components={{ start: <TimeAgo date={start} />, end: <TimeAgo date={end} /> }} />
    </div>
  );
};
const PROPOSAL_DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

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
  const { user } = useUserClient();
  const updateProposalVotesMutation = useUpdateProposalVotesMutation();
  const [loading, setLoading] = useState(false);
  const [voteSuccess, setVotesSuccess] = useState(voted);

  const totalHBD = proposalData.daily_pay?.amount.times(
    dayjs(proposalData?.end_date).diff(dayjs(proposalData.start_date), 'day')
  );
  const totalDays = dayjs(proposalData.end_date).diff(dayjs(proposalData.start_date), 'day');
  const daysLeft = proposalData.status === 'active' ? remainingDays(proposalData.end_date, Date.now()) : null;
  const postPath = `@${proposalData.creator}/${proposalData.permlink}`;

  const voteLabel = t('proposals_page.vote_for_proposal', { id: proposalData.proposal_id });
  const statusLabelKey = STATUS_LABEL_KEYS[proposalData.status];

  const totalVotes = totalVestingFund.times(proposalData.total_votes).div(totalShares).times(0.000001);

  function getFundingType() {
    if (isRefundProposal(proposalData, REFUND_ACCOUNTS))
      return <Badge variant="lime">{t('proposals_page.refund')}</Badge>;

    if (BURN_ACCOUNTS.includes(proposalData.receiver))
      return <Badge variant="orange">{t('proposals_page.burn')}</Badge>;

    return null;
  }
  useEffect(() => {
    setVotesSuccess(voted);
  }, [voted]);

  async function updateProposalVotes() {
    const params = {
      proposal_ids: [String(proposalData.proposal_id)],
      approve: !voteSuccess,
      extensions: []
    };

    try {
      setLoading(true);
      await updateProposalVotesMutation.mutateAsync(params);
      setVotesSuccess((prev) => !prev);
    } catch (error) {
      handleError(error, {
        method: 'updateProposalVotes',
        params
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex flex-col justify-between bg-white p-2.5 drop-shadow-xl dark:bg-slate-800 sm:flex-row "
      data-testid="proposal-list-item"
      data-proposal-id={proposalData.proposal_id}
    >
      <div className="w-3/4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`${env('BLOG_DOMAIN')}/${postPath}`} target="_blank" rel="noopener noreferrer">
                <span
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 md:text-lg"
                  data-testid="proposal-title"
                >
                  {proposalData.subject}
                  <span className="text-slate-500 dark:text-slate-400" data-testid="proposal-id">
                    {' #'}
                    {proposalData.proposal_id}
                  </span>
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <TitleSetter
                start={proposalData.start_date}
                end={proposalData.end_date}
                status={proposalData.status}
              />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="flex w-fit flex-col gap-3 py-3 text-xs min-[900px]:flex-row min-[900px]:items-center">
          <span className="whitespace-nowrap text-slate-500 dark:text-slate-400" data-testid="proposal-date">
            {dateFormat.format(dayjs(proposalData.start_date).toDate())}
            {' - '}
            {dateFormat.format(dayjs(proposalData.end_date).toDate())} {'('}
            {totalDays !== 1 ? totalDays + t('global.time.days') : t('global.time.a_day')}
            {')'}
          </span>
          <div className="whitespace-nowrap text-slate-500 dark:text-slate-400" data-testid="proposal-amount">
            <span
              title={numberWithCommas(totalHBD.toFixed(2)) + ' HBD'}
              className="font-semibold text-red-600 dark:text-red-200"
            >
              {getRoundedAbbreveration(totalHBD)} {' HBD'}
            </span>{' '}
            {'('}
            {t('proposals_page.daily')} {getRoundedAbbreveration(proposalData.daily_pay.amount)}
            {' HBD)'}
          </div>
          <ProposalPaidAmounts
            status={proposalData.status}
            dailyPay={proposalData.daily_pay.amount}
            totalDays={totalDays}
            paid={paid}
          />
          {daysLeft !== null ? (
            <span
              className="whitespace-nowrap text-slate-500 dark:text-slate-400"
              data-testid="proposal-remaining-days"
            >
              {t('proposals_page.remaining_days', { count: daysLeft })}
            </span>
          ) : null}
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger type="button">
                  <Badge variant="red" data-testid="proposal-status-badge">
                    {statusLabelKey ? t(statusLabelKey) : ''}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <TitleSetter
                    start={proposalData.start_date}
                    end={proposalData.end_date}
                    status={proposalData.status}
                  />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {getFundingType()}
            {funding ? <ProposalFundingBadge funding={funding} /> : null}
          </div>
        </div>
        {isReturnProposal ? (
          <p
            className="pb-3 text-xs italic text-slate-600 dark:text-slate-300"
            data-testid="proposal-return-note"
          >
            {t('proposals_page.return_proposal_note')}
          </p>
        ) : null}
        <div className="flex items-center gap-1 text-xs md:text-sm">
          <Link
            href={`${env('BLOG_DOMAIN')}/@${proposalData.creator}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <UserAvatarImg
              className="h-[30px] w-[30px] rounded-3xl"
              height="40"
              width="40"
              src={getUserAvatarUrl(proposalData.creator, 'medium')}
              alt={`${proposalData.creator} profile picture`}
            />
          </Link>
          {t('proposals_page.by')}
          <Link
            href={`${env('BLOG_DOMAIN')}/@${proposalData.creator}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              data-testid="proposal-creator"
            >
              {proposalData.creator}
            </span>
          </Link>
          {proposalData.receiver !== proposalData.creator && (
            <span>
              {t('proposals_page.for')}
              <Link
                href={`${env('BLOG_DOMAIN')}/@${proposalData.receiver}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  data-testid="proposal-receiver"
                >
                  {proposalData.receiver}
                </span>
              </Link>
            </span>
          )}
        </div>
        <Link
          href={`${env('BLOG_DOMAIN')}/${postPath}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block break-all text-xs text-slate-500 hover:underline dark:text-slate-400"
          data-testid="proposal-post-link"
        >
          {postPath}
        </Link>
      </div>
      <div className="mt-3 flex justify-between border-t-2 border-slate-300 p-2  dark:border-slate-600 sm:ml-2 sm:w-32 sm:flex-col sm:items-center sm:border-l-2 sm:border-t-0 sm:pl-4">
        <ProposalVotesButton
          proposalId={proposalData.id}
          totalVotesHp={totalVotes}
          totalShares={totalShares}
          totalVestingFund={totalVestingFund}
        />
        {user && user.isLoggedIn ? (
          <button
            type="button"
            className={cn('group relative flex', VOTE_FOCUS_RING)}
            aria-label={voteLabel}
            aria-pressed={voteSuccess}
            aria-busy={loading}
            onClick={loading ? undefined : updateProposalVotes}
          >
            {loading ? (
              <Icons.spinner className="animate-spin text-red-500" />
            ) : (
              <>
                <span className="opocity-75 absolute inline-flex h-6 w-6 rounded-full bg-red-500 p-0 group-hover:animate-ping dark:bg-red-400"></span>
                <Icons.arrowUpCircle
                  viewBox="1.7 1.7 20.7 20.7"
                  className={cn(
                    'relative inline-flex h-6 w-6 cursor-pointer rounded-full bg-white stroke-1 text-red-500 dark:bg-slate-800',
                    {
                      'bg-red-500! text-white': voteSuccess
                    }
                  )}
                  data-testid="voting-button-icon"
                />
              </>
            )}
          </button>
        ) : (
          <DialogLogin>
            <button
              type="button"
              className={cn('group relative flex', VOTE_FOCUS_RING)}
              aria-label={voteLabel}
            >
              <span className="opocity-75 absolute inline-flex h-6 w-6 rounded-full bg-red-500 p-0 group-hover:animate-ping dark:bg-red-400"></span>
              <Icons.arrowUpCircle
                viewBox="1.7 1.7 20.7 20.7"
                className="relative inline-flex h-6 w-6 cursor-pointer rounded-full bg-white stroke-1 text-red-500 dark:bg-slate-800"
                data-testid="voting-button-icon"
              />
            </button>
          </DialogLogin>
        )}
      </div>
    </div>
  );
}
