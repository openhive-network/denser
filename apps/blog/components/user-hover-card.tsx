import { HoverCard, HoverCardContent, HoverCardTrigger } from '@hive/ui/components/hover-card';
import UserAvatar from '@/blog/components/user-avatar';
import accountReputation from '@/blog/lib/account-reputation';

import { HoverCardData } from './hover-card-data';

export interface UserHoverCardProps {
  author: string;
  author_reputation: number;
  withImage?: boolean;
}

export function UserHoverCard({ author, author_reputation, withImage = false }: UserHoverCardProps) {
  return (
    <HoverCard>
      <HoverCardTrigger data-testid="author-name-link">
        <div className="flex items-center pl-1 font-bold hover:cursor-pointer hover:text-red-500">
          {withImage && <UserAvatar username={author} size="normal" />}
          <span className="hover:cursor-pointer hover:text-red-600">{author}</span>
        </div>
      </HoverCardTrigger>
      <span title="Reputation" className="mr-1 block font-normal" data-testid="author-reputation">
        ({accountReputation(author_reputation)})
      </span>
      <HoverCardContent className="w-72" data-testid="user-hover-card-content">
        <HoverCardData author={author} />
      </HoverCardContent>
    </HoverCard>
  );
}
