import { dateToRelative } from '@/lib/parse-date';
import { convertStringToBig } from '@/lib/helpers';
import Big from 'big.js';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card';
import { fmt } from '@/lib/utils';
import Link from 'next/link';
interface IBeneficiary {
  account: string;
  weight: number;
}

export default function DetailsCardHover({ post, historyFeedData, children }: any) {
  const historyFeedArr = historyFeedData.price_history;
  const price_per_hive = convertStringToBig(historyFeedArr[historyFeedArr.length - 1].base);
  const percent_hbd = post.percent_hbd / 20000;
  const _hbd = post.payout * percent_hbd;

  const pending_hp = Big(post.payout - _hbd).div(price_per_hive);
  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="flex w-80 flex-col">
        <span>Pending payout amount: ${post.payout.toFixed(2)}</span>
        <span>
          {' '}
          Breakdown: {_hbd.toFixed(2)} HBD, {pending_hp.toFixed(2)} HP
        </span>
        <>
          {post.beneficiaries.map((beneficiary: IBeneficiary, index: number) => (
            <Link
              href={`/@${beneficiary.account}`}
              className="hover:cursor-pointer hover:text-red-600"
              key={index}
            >
              {beneficiary.account}: {fmt(parseFloat(String(beneficiary.weight)) / 100)}%
            </Link>
          ))}
        </>
        <span>Payout in {dateToRelative(post.payout_at)}</span>
        {post.max_accepted_payout ? (
          <span>Max accepted payout: ${fmt(post.max_accepted_payout.split(' ')[0])}</span>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}
