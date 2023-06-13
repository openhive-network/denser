import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Vote } from '@/lib/hive';
import { prepareVotes } from '@/lib/utils';
import { Entry } from '@/lib/bridge';
import { ReactNode } from 'react';
import Link from 'next/link';

export default function DetailsCardVoters({
  post,
  activeVotesData,
  children
}: {
  post: Entry;
  activeVotesData: Vote[];
  children: ReactNode;
}) {
  const votes = prepareVotes(post, activeVotesData);

  const sliced = votes
    .sort((a, b) => {
      const keyA = a['reward']!;
      const keyB = b['reward']!;

      if (keyA > keyB) return -1;
      if (keyA < keyB) return 1;
      return 0;
    })
    .slice(0, 20);

  return (
    <HoverCard>
      <HoverCardTrigger asChild className="hover:cursor-pointer">
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="flex w-auto flex-col">
        <ul>
          {sliced.map((vote: Vote, index: number) => (
            <li key={index}>
              <Link href={`/@${vote.voter}`} className="hover:cursor-pointer hover:text-red-600">
                {vote.voter}: $
                {vote.reward
                  ? Math.abs(parseFloat(vote.reward.toString())) < 0.0001
                    ? 0
                    : Number(vote.reward).toFixed(2)
                  : null}
              </Link>
            </li>
          ))}
          <li className="pt-1.5 text-sm text-gray-500">and {votes.length - 20} more</li>
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}
