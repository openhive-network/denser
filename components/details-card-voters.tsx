import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

interface IActiveVotes {
  rshares: number;
  voter: string;
}

export default function DetailsCardVoters({ activeVotes, children }: any) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="flex w-80 flex-col">
        <ul>
          {activeVotes.slice(0, 19)?.map((comment: IActiveVotes, index: number) => (
            <li key={index}>{comment.voter}</li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}
