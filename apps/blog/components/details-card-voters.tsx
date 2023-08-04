import { HoverCard, HoverCardContent, HoverCardTrigger } from '@hive/ui/components/hover-card';
import { Vote } from '@/blog/lib/hive';
import { prepareVotes } from '@/blog/lib/utils';
import { Entry } from '@/blog/lib/bridge';
import { ReactNode } from 'react';
import Link from 'next/link';
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
