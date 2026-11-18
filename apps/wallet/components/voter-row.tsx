import Big from 'big.js';
import clsx from 'clsx';
import { Link, getUserAvatarUrl, UserAvatarImg } from '@hive/ui';
import { getRoundedAbbreveration, numberWithCommas } from '@hive/ui/lib/utils';
import { useTranslation } from '@/wallet/i18n/client';
import { formatShare, shareOf, voterHp, type Voter } from '@/wallet/lib/voters';

const shortHp = (hp: number) => getRoundedAbbreveration(Big(hp));
const exactHp = (hp: number) => numberWithCommas(hp.toFixed(3));

/** The weight column of a row: "16.82M HP + 16.60M proxy", the exact amounts as its title. */
function VoterWeight({ weight }: { weight: NonNullable<Voter['weight']> }) {
  const { t } = useTranslation('common_wallet');
  const { ownHp, proxyHp } = weight;
  const text =
    proxyHp > 0
      ? t('voters_dialog.weight_with_proxy', { own: shortHp(ownHp), proxy: shortHp(proxyHp) })
      : `${shortHp(ownHp)} HP`;
  const title =
    proxyHp > 0
      ? t('voters_dialog.weight_exact_with_proxy', { own: exactHp(ownHp), proxy: exactHp(proxyHp) })
      : `${exactHp(ownHp)} HP`;
  return (
    <span
      className="min-w-0 flex-1 truncate text-xs text-slate-500 dark:text-slate-400"
      title={title}
      data-testid="voter-values-dialog"
    >
      {text}
    </span>
  );
}

interface VoterRowProps {
  voter: Voter;
  /** The total the voter's share is of; null when the voters carry no weights. */
  totalHp: number | null;
  isOwn: boolean;
  tabIndex: number;
  onFocus: () => void;
}

/** One voter on one line: avatar, name linked to their profile, weight and share of the total. */
function VoterRow({ voter, totalHp, isOwn, tabIndex, onFocus }: VoterRowProps) {
  const { t } = useTranslation('common_wallet');
  return (
    <li
      className={clsx('flex h-10 min-w-0 items-center gap-2 rounded-md px-1.5 whitespace-nowrap', {
        'bg-rose-100 dark:bg-rose-900/50': isOwn
      })}
      data-testid="voter-row"
      data-own={isOwn || undefined}
    >
      <UserAvatarImg
        className="h-8 w-8 min-w-8 rounded-full"
        height="32"
        width="32"
        loading="lazy"
        src={getUserAvatarUrl(voter.name, 'small')}
        alt=""
      />
      <Link
        href={`/@${voter.name}`}
        target="_blank"
        className="max-w-[45%] shrink-0 truncate text-sm font-medium text-red-500"
        data-testid="proposal-voter-link-dialog"
        tabIndex={tabIndex}
        onFocus={onFocus}
      >
        {voter.name}
        {isOwn && <span className="sr-only"> ({t('voters_dialog.your_vote')})</span>}
      </Link>
      {voter.weight ? <VoterWeight weight={voter.weight} /> : <span className="flex-1" />}
      {voter.weight && totalHp !== null && (
        <span className="shrink-0 text-right text-xs tabular-nums" data-testid="voter-share">
          {formatShare(shareOf(voterHp(voter), totalHp))}
        </span>
      )}
    </li>
  );
}

export default VoterRow;
