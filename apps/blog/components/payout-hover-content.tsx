import { dateToRelative } from '@hive/ui/lib/parse-date';
import Big from 'big.js';
import Link from 'next/link';
import { fmt } from '../lib/utils';
import { useQuery } from '@tanstack/react-query';
import Loading from '@hive/ui/components/loading';
import { convertStringToBig } from '@hive/ui/lib/helpers';
import { getFeedHistory } from '@hive/ui/lib/hive';
import { Entry } from '../lib/bridge';
import moment from 'moment';
import { useTranslation } from 'next-i18next';

interface IBeneficiary {
  account: string;
  weight: number;
}

export default function PayoutHoverContent({ post }: { post: Entry }) {
  const { t } = useTranslation('common_blog');
  const { data, isLoading } = useQuery(['feedHistory'], () => getFeedHistory());
  if (isLoading || !data) {
    return <Loading loading />;
  }
  const historyFeedArr = data?.price_history;
  const price_per_hive = convertStringToBig(historyFeedArr[historyFeedArr.length - 1].base);
  const percent_hbd = post.percent_hbd / 20000;
  const _hbd = post.payout * percent_hbd;
  const pending_hp = price_per_hive ? Big(post.payout - _hbd).div(price_per_hive) : null;
  const pastPayout = moment(post.payout_at).diff(moment()) < 0;
  if (pastPayout) {
    return <>
      <span>{t('amount_hover_card.past_payouts', { value: post.payout.toFixed(2) })}</span>
      <span>- {t('amount_hover_card.author', { value: convertStringToBig(post.author_payout_value).toFixed(2) })}</span>
      <span>- {t('amount_hover_card.curators', { value: convertStringToBig(post.curator_payout_value).toFixed(2) })}</span>
    </>;
  }

  return (
    <>
      <span>{t('amount_hover_card.pending_payout_amount', { value: post.payout.toFixed(2) })}</span>
      <span>
          {t('amount_hover_card.breakdown')} {_hbd.toFixed(2)} HBD, {pending_hp ? <>{pending_hp.toFixed(2)} HP</> : null}
        </span>
      <>
        {post.beneficiaries.map((beneficiary: IBeneficiary, index: number) => (
          <Link
            href={`/@${beneficiary.account}`}
            className='hover:cursor-pointer hover:text-red-600'
            key={index}
          >
            {beneficiary.account}: {fmt(parseFloat(String(beneficiary.weight)) / 100)}%
          </Link>
        ))}
      </>
      <span>{t('amount_hover_card.payout_in')} {dateToRelative(post.payout_at, t).replace("in", "")}</span>
      {convertStringToBig(post.max_accepted_payout).lt(1000000) ?
        <span>{t('amount_hover_card.ax_accepted_payout',{value: fmt(post.max_accepted_payout.split(' ')[0])})}</span> : null}
    </>);

}