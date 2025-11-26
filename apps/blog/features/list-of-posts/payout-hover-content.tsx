'use client';

import { dateToRelative } from '@ui/lib/parse-date';
import Link from 'next/link';
import { amt, fmt } from '@/blog/lib/utils';
import { useQuery } from '@tanstack/react-query';
import Big from 'big.js';
import Loading from '@ui/components/loading';
import { convertStringToBig } from '@ui/lib/helpers';
import { getFeedHistory } from '@transaction/lib/hive-api';
import { Entry } from '@transaction/lib/extended-hive.chain';
import moment from 'moment';
import { useTranslation } from '@/blog/i18n/client';

interface IBeneficiary {
  account: string;
  weight: number;
}

export default function PayoutHoverContent({ post }: { post: Entry }) {
  const { t } = useTranslation('common_blog');
  const { data, isLoading } = useQuery({
    queryKey: ['feedHistory'],
    queryFn: () => getFeedHistory()
  });
  if (isLoading || !data) {
    return <Loading loading />;
  }
  const historyFeedArr = data?.price_history;
  const price_per_hive = convertStringToBig(historyFeedArr[historyFeedArr.length - 1].base.amount);
  const percent_hbd = post.percent_hbd / 20000;
  const _hbd = post.payout * percent_hbd;
  const pending_payout = amt(post.pending_payout_value);
  const pending_hp = price_per_hive ? (pending_payout - _hbd) / (price_per_hive.toNumber() / 1000) : null;
  const d = post.payout_at;
  const isTimeZoned = d.indexOf('.') !== -1 || d.indexOf('+') !== -1 ? d : `${d}.000Z`;
  const pastPayout = moment(isTimeZoned).diff(moment()) < 0;
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
        {t('amount_hover_card.breakdown')} {_hbd.toFixed(2)} HBD,{' '}
        {pending_hp ? <>{pending_hp.toFixed(2)} HP</> : null}
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
