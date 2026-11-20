import { Link } from '@hive/ui';
import { RankedWitness, WitnessProfile } from '@/wallet/lib/witness-list';
import clsx from 'clsx';
import { DISABLED_SIGNING_KEY } from '@/wallet/lib/constants';
import { blockGap } from '@hive/ui/lib/utils';
import { convertStringToBig } from '@hive/ui/lib/helpers';
import {
  formatAbbreviatedAmount,
  formatDollars,
  formatLargestUnitDuration,
  getRoundedAbbreveration,
  parseUtcTimestamp
} from '@ui/lib/locale-format';
import { Icons } from '@hive/ui/components/icons';
import { memo, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/wallet/i18n/client';
import TimeAgo from '@ui/components/time-ago';
import { getUserAvatarUrl, UserAvatarImg } from '@hive/ui';
import { useLocale } from '@ui/components/locale-context';
import { hasPublishedFeed, isVersionBelow } from '@/wallet/lib/witness-row';
import WitnessVoteButton from './witness-vote-button';
import WitnessSiteLink from './witness-site-link';
import type { VestingTotals } from '@/wallet/lib/voters';
import { useLazyDialog } from './hooks/use-lazy-dialog';
import { DOTTED_ITEM_CLASS, DOTTED_ROW_CLASS } from './dotted-row';

// Loaded when a row's voters are first opened: the witness page's own load carries none of it.
const WitnessVotersDialog = dynamic(() => import('./witness-voters-dialog'), { ssr: false });

const getOwnersString = (owners?: string) => {
  if (!owners) return '';
  const ownersArray = owners.split(',');
  const lastOwner = ownersArray.pop();
  if (ownersArray.length === 0) return lastOwner;
  return ownersArray.join(', ') + ' & ' + lastOwner;
};

interface WitnessListItemProps {
  data: RankedWitness;
  witnessProfile?: WitnessProfile;
  headBlock: number;
  /** The chain totals the voters' VESTS are valued at */
  vestingTotals: VestingTotals;
  /** The version most of the top witnesses run; a lower one is flagged on narrow screens */
  majorityVersion?: string;
  /** Whether the row is the one the page's `highlight` parameter names */
  highlighted: boolean;
  onVote: (witness: string, approve: boolean) => void;
  voteEnabled: boolean;
  isVoted: boolean;
  voteLoading: boolean;
}

const ONE_WEEK_IN_SEC = 604800;
const ONE_DAY_IN_SEC = 86400;
const MUTED_TEXT = 'text-gray-600 dark:text-gray-400';
const MUTED_DOT = 'before:text-gray-600 dark:before:text-gray-400';
const NO_FEED = '—';
const VOTERS_TRIGGER_CLASS = 'flex items-center gap-1 text-xs text-red-500 hover:underline dark:text-red-400';

function WitnessListItem({
  data,
  headBlock,
  vestingTotals,
  witnessProfile,
  majorityVersion,
  highlighted,
  onVote,
  voteEnabled,
  isVoted,
  voteLoading
}: WitnessListItemProps) {
  const { t } = useTranslation('common_wallet');
  const { locale } = useLocale();
  const disableUser = data.signing_key === DISABLED_SIGNING_KEY;
  const witnessDescription = witnessProfile?.witnessDescription;
  const witnessOwner = witnessProfile?.witnessOwner;
  const isStale = data.witnessLastBlockAgeInSecs > ONE_WEEK_IN_SEC;
  const isOutdated = majorityVersion !== undefined && isVersionBelow(data.running_version, majorityVersion);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const toggleDescription = () => setDescriptionExpanded((expanded) => !expanded);

  const nameTitle = [
    t('witnesses_page.navigate_to_witness_profile'),
    disableUser
      ? null
      : t('witnesses_page.witness_age', {
          age: formatLargestUnitDuration((Date.now() - parseUtcTimestamp(data.created)) / 1000, locale)
        }),
    `v${data.running_version}`
  ]
    .filter(Boolean)
    .join('\n');
  const hp = formatAbbreviatedAmount(data.vestsToHp, 'HP', locale);
  const rankUp = data.requiredHpToRankUp ? getRoundedAbbreveration(data.requiredHpToRankUp, locale) : null;
  const rankUpText = rankUp
    ? t('witnesses_page.hp_to_rank_up', { value: rankUp, rank: data.rank - 1 })
    : null;
  const priceFeed = formatDollars(convertStringToBig(data.hbd_exchange_rate.base), locale, 3);
  const feedPublished = hasPublishedFeed(data.last_hbd_exchange_update);
  const votersDialog = useLazyDialog();
  const showVotersLabel = t('witnesses_page.show_voters_label', { witness: data.owner });

  const ref = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlighted]);

  return (
    <tr
      className={clsx('align-top', {
        'bg-rose-200  dark:bg-rose-800': highlighted,
        'even:bg-zinc-100 dark:even:bg-slate-900': !highlighted
      })}
      ref={ref}
    >
      <td className="py-1.5 pl-1 sm:pl-2">
        <div className="flex items-center gap-1.5 sm:text-sm">
          <span>{String(data.rank).padStart(2, '0')}</span>
          <WitnessVoteButton
            owner={data.owner}
            highlighted={highlighted}
            onVote={onVote}
            voteEnabled={voteEnabled}
            isVoted={isVoted}
            voteLoading={voteLoading}
          />
        </div>
      </td>
      <td className="py-1.5 pr-2 font-light md:font-normal">
        <div className="flex min-w-0 gap-2" data-testid="witness-list-item-info">
          <Link
            href={`/@${data.owner}`}
            target="_blank"
            className="hidden shrink-0 sm:block"
            title={t('witnesses_page.navigate_to_witness_profile')}
          >
            <UserAvatarImg
              className={clsx('h-8 w-8 min-w-8 rounded-full', { 'opacity-50': disableUser })}
              height="32"
              width="32"
              src={getUserAvatarUrl(data.owner, 'small')}
              alt={t('global.profile_picture_of', { username: data.owner })}
            />
          </Link>
          <div className="min-w-0 flex-1 leading-5">
            {/* The site link moves to its own line only where it would run into the version column */}
            <div className={clsx(DOTTED_ROW_CLASS, 'min-w-0 whitespace-nowrap')}>
              <div className="flex min-w-0 flex-wrap items-center gap-x-1.5">
                <Link
                  href={`/@${data.owner}`}
                  data-testid="witness-name-link"
                  target="_blank"
                  title={nameTitle}
                  className="shrink-0"
                >
                  <div
                    className={clsx('font-semibold sm:text-sm', {
                      'text-gray-500 line-through opacity-50 dark:text-gray-300': disableUser,
                      'font-bold text-red-500': !disableUser
                    })}
                  >
                    {data.owner}
                  </div>
                </Link>
                {witnessOwner && (
                  <span className={clsx('min-w-0 truncate', MUTED_TEXT)}>
                    {/* eslint-disable-next-line @hive/i18n/no-joined-translation -- an existing fragment join, to become one key with placeholders */}
                    {t('witnesses_page.by')} {getOwnersString(witnessOwner)}
                  </span>
                )}
                <Link
                  href={!highlighted ? `/~witnesses?highlight=${data.owner}` : `/~witnesses`}
                  replace
                  scroll={false}
                  className="shrink-0"
                  data-testid="witness-highlight-link"
                  title={t('witnesses_page.use_this_for_linking_title')}
                  aria-label={t('witnesses_page.link_to_witness', { witness: data.owner })}
                >
                  <Icons.link className="h-[1em] w-[1em]" />
                </Link>
                {isStale && !disableUser && (
                  <span
                    className="shrink-0 rounded-sm bg-red-600 px-1 text-[11px] font-semibold leading-4 text-white"
                    title={t('witnesses_page.has_not_produced_blocks')}
                    data-testid="witness-has-not-produced-blocks-warning"
                  >
                    <Link
                      href={`https://hiveblocks.com/b/${data.last_confirmed_block_num}`}
                      data-testid="last-block-number"
                    >
                      {t('witnesses_page.no_blocks_for_days', {
                        count: Math.floor(data.witnessLastBlockAgeInSecs / ONE_DAY_IN_SEC)
                      })}
                    </Link>
                  </span>
                )}
                {isOutdated && (
                  <span className="shrink-0 rounded-sm bg-amber-200 px-1 text-[11px] leading-4 text-amber-900 sm:hidden dark:bg-amber-900 dark:text-amber-100">
                    {`v${data.running_version}`}
                  </span>
                )}
              </div>
              <span
                className={clsx(DOTTED_ITEM_CLASS, MUTED_DOT, 'flex min-w-0')}
                data-testid="witness-external-site-link"
              >
                {disableUser ? (
                  <span className="truncate">
                    {/* eslint-disable-next-line @hive/i18n/no-joined-translation -- an existing fragment join, to become one key with placeholders */}
                    {t('witnesses_page.disabled')}
                    {blockGap(headBlock, data.last_confirmed_block_num, t, locale)}
                  </span>
                ) : (
                  <WitnessSiteLink url={data.url} />
                )}
              </span>
            </div>
            {!disableUser && witnessDescription && (
              <button
                type="button"
                title={witnessDescription}
                aria-expanded={descriptionExpanded}
                data-testid="witness-description"
                onClick={toggleDescription}
                className={clsx('hidden w-full max-w-full cursor-pointer text-left sm:block', MUTED_TEXT, {
                  truncate: !descriptionExpanded,
                  'whitespace-pre-line wrap-break-word': descriptionExpanded
                })}
              >
                {witnessDescription}
              </button>
            )}
            <div className={clsx('truncate sm:hidden', MUTED_TEXT)} data-testid="witness-phone-summary">
              {hp}
              {rankUp && ` (+${rankUp})`} ·{' '}
              {feedPublished ? (
                <>
                  {priceFeed} · <TimeAgo date={data.last_hbd_exchange_update} timeStyle="narrow" />
                </>
              ) : (
                <span title={t('witnesses_page.no_price_feed')}>{NO_FEED}</span>
              )}
            </div>
            <button
              type="button"
              onClick={votersDialog.openFrom}
              aria-label={showVotersLabel}
              className={clsx(VOTERS_TRIGGER_CLASS, 'sm:hidden')}
              data-testid="witness-voters-trigger-phone"
            >
              <Icons.list className="h-3 w-3" aria-hidden="true" />
              {t('witnesses_page.voters')}
            </button>
          </div>
        </div>
      </td>
      <td
        className={clsx('hidden py-1.5 pr-2 leading-5 sm:table-cell sm:text-sm', { 'text-amber-700 dark:text-amber-400': isOutdated })}
        data-testid="witness-version"
      >
        {data.running_version}
      </td>
      <td className="hidden py-1.5 pr-2 leading-5 sm:table-cell">
        {/* Voters shares the HP line from md up (the column is sized for it), so it adds no line to the row */}
        <div className="flex flex-wrap items-center gap-x-2">
          <div className="font-medium sm:text-sm" data-testid="witness-votes-received">
            {hp}
          </div>
          <button
            type="button"
            onClick={votersDialog.openFrom}
            aria-label={showVotersLabel}
            className={VOTERS_TRIGGER_CLASS}
            data-testid="witness-voters-trigger"
          >
            <Icons.list className="h-3 w-3" aria-hidden="true" />
            {t('witnesses_page.voters')}
          </button>
        </div>
        {rankUpText && (
          <div className={clsx('wrap-break-word', MUTED_TEXT)} title={rankUpText} data-testid="witness-rank-up">
            {rankUpText}
          </div>
        )}
      </td>
      <td className="hidden truncate py-1.5 pr-2 leading-5 sm:table-cell sm:text-sm" data-testid="witness-price-feed-cell">
        {feedPublished ? (
          <>
            <span className="font-medium" data-testid="witness-price-feed">
              {priceFeed}
            </span>
            <span className={MUTED_TEXT}>
              {' · '}
              <TimeAgo date={data.last_hbd_exchange_update} timeStyle="narrow" />
            </span>
          </>
        ) : (
          <span
            className={MUTED_TEXT}
            title={t('witnesses_page.no_price_feed')}
            data-testid="witness-price-feed"
          >
            {NO_FEED}
          </span>
        )}
        {votersDialog.mounted && (
          <WitnessVotersDialog
            witness={data.owner}
            totalHp={Number(data.vestsToHp)}
            totals={vestingTotals}
            open={votersDialog.open}
            onOpenChange={votersDialog.onOpenChange}
            onCloseAutoFocus={votersDialog.onCloseAutoFocus}
          />
        )}
      </td>
    </tr>
  );
}

export default memo(WitnessListItem);
