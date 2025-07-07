import { HoverCard, HoverCardContent, HoverCardTrigger } from '@hive/ui/components/hover-card';
import { cn } from '@ui/lib/utils';
import { ReactNode, useRef, useState } from 'react';
import { Entry } from '@transaction/lib/extended-hive.chain';
import PayoutHoverContent from './payout-hover-content';

type DetailsCardHoverProps = {
  post: Entry;
  children: ReactNode;
  decline?: boolean;
  post_page?: boolean;
};

export default function DetailsCardHover({ post, children, decline, post_page }: DetailsCardHoverProps) {
  const [open, setOpen] = useState(false);
  const isHovering = useRef(false);

  const handleMouseEnter = () => {
    isHovering.current = true;
    setOpen(true);
  };

  const handleMouseLeave = () => {
    isHovering.current = false;
    setTimeout(() => {
      if (!isHovering.current) setOpen(false);
    }, 100);
  };
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

  return (
    <HoverCard open={open}>
      <HoverCardTrigger
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setOpen(!open)}
        asChild
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="flex w-auto flex-col"
        data-testid="payout-post-card-tooltip"
      >
        <PayoutHoverContent post={post} />
      </HoverCardContent>
    </HoverCard>
  );
}
