'use client';

import { dateToRelative } from '@ui/lib/parse-date';
import { Link } from '@hive/ui';
import { amt, fmt } from '@/blog/lib/utils';
import { useQuery } from '@tanstack/react-query';
import Big from 'big.js';
import Loading from '@ui/components/loading';
import { convertStringToBig } from '@ui/lib/helpers';
import { getFeedHistory } from '@transaction/lib/hive-api';
import { Entry } from '@hive/common-hiveio-packages/wax';
import { useTranslation } from '@/blog/i18n/client';
import { useDynamicGlobalData } from '@/blog/components/hooks/use-dynamic-global-data';

interface IBeneficiary {
  account: string;
  weight: number;
}

// hbd_print_rate is expressed in basis points; 10000 == 100% (no haircut).
const HBD_PRINT_RATE_MAX = 10000;

export default function PayoutHoverContent({ post }: { post: Entry }) {
  const { t } = useTranslation('common_blog');
  const { data, isLoading } = useQuery({
    queryKey: ['feedHistory'],
    queryFn: () => getFeedHistory()
  });
  const { data: globalData, isLoading: globalDataLoading } = useDynamicGlobalData();
  if (isLoading || !data || globalDataLoading || !globalData) {
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
  const pastPayout = new Date() > new Date(`${post.payout_at}Z`);
  if (pastPayout) {
    return (
      <>
        <span>{t('amount_hover_card.past_payouts', { value: post.payout.toFixed(2) })}</span>
        <span>
          -{' '}
          {t('amount_hover_card.author', { value: convertStringToBig(post.author_payout_value).toFixed(2) })}
        </span>
        <span>
          -{' '}
          {t('amount_hover_card.curators', {
            value: convertStringToBig(post.curator_payout_value).toFixed(2)
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
                  - {beneficiary.account}: $
                  {Big(post.payout / 2)
                    .times(beneficiary.weight)
                    .div(10000)
                    .toFixed(2)}
                </Link>
              ))
            : null}
        </span>
      </>
    );
  }

  return (
    <>
      <span>{t('amount_hover_card.pending_payout_amount', { value: post.payout.toFixed(2) })}</span>
      <span>
        {t('amount_hover_card.breakdown')} {pending_hbd.toFixed(2)} HBD,{' '}
        {globalData.hbd_print_rate !== HBD_PRINT_RATE_MAX && pending_hive !== null ? (
          <>{pending_hive.toFixed(2)} HIVE, </>
        ) : null}
        {pending_hp !== null ? <>{pending_hp.toFixed(2)} HP</> : null}
      </span>
      <>
        {post.beneficiaries.map((beneficiary: IBeneficiary, index: number) => (
          <Link
            href={`/@${beneficiary.account}`}
            className="hover:cursor-pointer hover:text-destructive"
            key={index}
          >
            {beneficiary.account}: {fmt(parseFloat(String(beneficiary.weight)) / 100)}%
          </Link>
        ))}
      </>
      <span>
        {t('amount_hover_card.payout_in')} {dateToRelative(post.payout_at, t).replace('in', '')}
      </span>
      {convertStringToBig(post.max_accepted_payout).lt(1000000) ? (
        <span>
          {t('amount_hover_card.max_accepted_payout', { value: fmt(post.max_accepted_payout.split(' ')[0]) })}
        </span>
      ) : null}
    </>
  );
}
