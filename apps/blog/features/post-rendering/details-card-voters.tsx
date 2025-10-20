import { HoverCard, HoverCardContent, HoverCardTrigger } from '@hive/ui/components/hover-card';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { ReactNode, useRef, useState } from 'react';
import VotersDetailsData from './votes-details-data';

export default function DetailsCardVoters({ post, children }: { post: Entry; children: ReactNode }) {
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

  return (
    <HoverCard open={open}>
      <HoverCardTrigger
        asChild
        className="hover:cursor-pointer"
        data-testid="comment-votes"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setOpen(!open)}
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        className="flex w-auto flex-col"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <VotersDetailsData post={post} />
      </HoverCardContent>
    </HoverCard>
  );
}
