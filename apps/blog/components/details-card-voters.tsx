import { HoverCard, HoverCardContent, HoverCardTrigger } from '@ui/components/hover-card';
import { Entry } from '@ui/lib/bridge';
import { ReactNode } from 'react';
import VotersDetailsData from './votes-details-data';

export default function DetailsCardVoters({ post, children }: { post: Entry; children: ReactNode }) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild className="hover:cursor-pointer" data-testid="comment-votes">
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="flex w-auto flex-col">
        <VotersDetailsData post={post} />
      </HoverCardContent>
    </HoverCard>
  );
}
