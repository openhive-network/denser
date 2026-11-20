'use client';

import { Link } from '@hive/ui';
import { useLocale } from '@ui/components/locale-context';
import { formatAmount, formatDollars, formatList, formatNumber, formatPercent, getTimeAgoString } from '@ui/lib/locale-format';
import { amt } from '@/blog/lib/utils';
import { useQuery } from '@tanstack/react-query';
import Big from 'big.js';
import Loading from '@ui/components/loading';
import { convertStringToBig } from '@ui/lib/helpers';
import { getFeedHistory } from '@transaction/lib/hive-api';
import type { TrimmedEntry } from './lib/card-entry';
import { useTranslation } from '@/blog/i18n/client';
import { useDynamicGlobalData } from '@/blog/components/hooks/use-dynamic-global-data';

interface IBeneficiary {
  account: string;
  weight: number;
}

// hbd_print_rate is expressed in basis points; 10000 == 100% (no haircut).
const HBD_PRINT_RATE_MAX = 10000;

export default function PayoutHoverContent({ post }: { post: TrimmedEntry }) {
  const { t } = useTranslation('common_blog');
  const { locale } = useLocale();
  const { data, isPending } = useQuery({
    queryKey: ['feedHistory'],
    queryFn: () => getFeedHistory()
  });
  const { data: globalData, isPending: globalDataLoading } = useDynamicGlobalData();
  if (isPending || !data || globalDataLoading || !globalData) {
    return <Loading loading />;
  }
  const historyFeedArr = data?.price_history;
  const price_per_hive = convertStringToBig(historyFeedArr[historyFeedArr.length - 1].base.amount);
  const normalized_price = price_per_hive.toNumber() / 1000;
  const percent_hbd = post.percent_hbd / 20000;
  const pending_payout = amt(post.pending_payout_value);
  // Portion of the payout designated to be paid in HBD, before the print-rate "haircut".
  const _hbd = pending_payout * percent_hbd;
  // HBD printing haircut: when hbd_print_rate < max the chain mints less (or no) HBD and pays
  // the shortfall as liquid HIVE instead. Mirrors condenser's Voting.jsx breakdown so the
  // displayed split matches what the author will actually receive.
  const pending_hbd = _hbd * (globalData.hbd_print_rate / HBD_PRINT_RATE_MAX);
  const pending_hive = normalized_price ? (_hbd - pending_hbd) / normalized_price : null;
  const pending_hp = normalized_price ? (pending_payout - _hbd) / normalized_price : null;
  const breakdown = [
    formatAmount(pending_hbd, 'HBD', locale, 2),
    ...(globalData.hbd_print_rate !== HBD_PRINT_RATE_MAX && pending_hive !== null
      ? [formatAmount(pending_hive, 'HIVE', locale, 2)]
      : []),
    ...(pending_hp !== null ? [formatAmount(pending_hp, 'HP', locale, 2)] : [])
  ];
  const pastPayout = new Date() > new Date(`${post.payout_at}Z`);
  if (pastPayout) {
    return (
      <>
        <span>{t('amount_hover_card.past_payouts', { value: formatNumber(post.payout, locale, 2) })}</span>
        <span>
          -{' '}
          {t('amount_hover_card.author', {
            value: formatNumber(convertStringToBig(post.author_payout_value), locale, 2)
          })}
        </span>
        <span>
          -{' '}
          {t('amount_hover_card.curators', {
            value: formatNumber(convertStringToBig(post.curator_payout_value), locale, 2)
          })}
        </span>
        <span>
          {post.beneficiaries.length > 0
            ? post.beneficiaries.map((beneficiary: IBeneficiary, index: number) => (
                <Link
                  href={`/@${beneficiary.account}`}
                  className="hover:cursor-pointer hover:text-destructive"
                  key={index}
                >
                  - {beneficiary.account}:{' '}
                  {formatDollars(Big(post.payout / 2).times(beneficiary.weight).div(10000), locale)}
                </Link>
              ))
            : null}
        </span>
      </>
    );
  }

  return (
    <>
      <span>{t('amount_hover_card.pending_payout_amount', { value: formatNumber(post.payout, locale, 2) })}</span>
      <span>
        {t('amount_hover_card.breakdown')} {formatList(breakdown, locale, 'unit')}
      </span>
      <>
        {post.beneficiaries.map((beneficiary: IBeneficiary, index: number) => (
          <Link
            href={`/@${beneficiary.account}`}
            className="hover:cursor-pointer hover:text-destructive"
            key={index}
          >
            {beneficiary.account}: {formatPercent(Number(beneficiary.weight) / 100, locale, 2)}
          </Link>
        ))}
      </>
      <span>
        {t('amount_hover_card.payout_in', { time: getTimeAgoString(post.payout_at, locale, Date.now()) })}
      </span>
      {convertStringToBig(post.max_accepted_payout).lt(1000000) ? (
        <span>
          {t('amount_hover_card.max_accepted_payout', {
            value: formatNumber(convertStringToBig(post.max_accepted_payout), locale, 2)
          })}
        </span>
      ) : null}
    </>
  );
}
