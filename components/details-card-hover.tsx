import { dateToRelative } from '@/lib/parse-date';
import { convertStringToBig } from '@/lib/helpers';
import Big from 'big.js';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card';
import { fmt } from '@/lib/utils';
import Link from 'next/link';
import { ReactNode } from 'react';
import { Entry } from '@/lib/bridge';
import Loading from './loading';
interface IBeneficiary {
  account: string;
  weight: number;
}

type DetailsCardHoverProps = {
  post: Entry;
  price_per_hive: Big;
  children: ReactNode;
  decline?: boolean;
};

export default function DetailsCardHover({ post, price_per_hive, children, decline }: DetailsCardHoverProps) {
  if (post.payout <= 0) {
    return (
      <div className="flex items-center" data-testid="post-payout">
        {'$ '}
        {post.payout.toFixed(2)}
      </div>
    );
  }

  const percent_hbd = post.percent_hbd / 20000;
  const _hbd = post.payout * percent_hbd;
  const max_payout = convertStringToBig(post.max_accepted_payout);
  const pending_hp = Big(post.payout - _hbd).div(price_per_hive);

  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="flex w-auto flex-col" data-testid="payout-post-card-tooltip">
        {decline ? (
          <span>Payout declined</span>
        ) : (
          <>
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
            {max_payout.eq(0) ? (
              <span>Payout Declined</span>
            ) : max_payout.lt(1000000) ? (
              <span>Max accepted payout: ${fmt(post.max_accepted_payout.split(' ')[0])}</span>
            ) : null}
          </>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
