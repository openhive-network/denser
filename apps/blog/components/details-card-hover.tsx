import { dateToRelative } from '@hive/ui/lib/parse-date';
import { convertStringToBig } from '@hive/ui/lib/helpers';
import Big from 'big.js';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@hive/ui/components/hover-card';
import { cn, fmt } from '@/blog/lib/utils';
import Link from 'next/link';
import { ReactNode } from 'react';
import { Entry } from '@/blog/lib/bridge';
interface IBeneficiary {
  account: string;
  weight: number;
}

type DetailsCardHoverProps = {
  post: Entry;
  price_per_hive?: Big;
  children: ReactNode;
  decline?: boolean;
  post_page?: boolean;
};

export default function DetailsCardHover({
  post,
  price_per_hive,
  children,
  decline,
  post_page
}: DetailsCardHoverProps) {
  if (decline) {
    return (
      <div
        className={cn(`flex items-center line-through opacity-50`, { 'text-red-500': post_page })}
        data-testid="post-payout-decline"
        title="Payout Declined"
      >
        {'$'}
        {post.payout.toFixed(2)}
      </div>
    );
  }

  if (post.payout <= 0) {
    return (
      <div className="flex items-center" data-testid="post-payout">
        {'$'}
        {post.payout.toFixed(2)}
      </div>
    );
  }

  const percent_hbd = post.percent_hbd / 20000;
  const _hbd = post.payout * percent_hbd;
  const max_payout = convertStringToBig(post.max_accepted_payout);
  const pending_hp = price_per_hive ? Big(post.payout - _hbd).div(price_per_hive) : null;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="flex w-auto flex-col" data-testid="payout-post-card-tooltip">
        <>
          <span>Pending payout amount: ${post.payout.toFixed(2)}</span>
          <span>
            Breakdown: {_hbd.toFixed(2)} HBD, {pending_hp ? <>{pending_hp.toFixed(2)} HP</> : null}
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
          <span>Max accepted payout: ${fmt(post.max_accepted_payout.split(' ')[0])}</span>
        </>
      </HoverCardContent>
    </HoverCard>
  );
}
