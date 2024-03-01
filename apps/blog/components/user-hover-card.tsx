import { HoverCard, HoverCardContent, HoverCardTrigger } from '@ui/components/hover-card';
import UserAvatar from '@/blog/components/user-avatar';
import accountReputation from '@/blog/lib/account-reputation';
import { HoverCardData } from './hover-card-data';
import { useTranslation } from 'next-i18next';

export interface UserHoverCardProps {
  author: string;
  author_reputation: number;
  blacklist: string[];
  withImage?: boolean;
}

export function UserHoverCard({
  author,
  author_reputation,
  blacklist,
  withImage = false
}: UserHoverCardProps) {
  const { t } = useTranslation('common_blog');
  return (
    <HoverCard>
      <HoverCardTrigger data-testid="author-name-link">
        <div className="flex items-center pl-1 font-bold hover:cursor-pointer hover:text-red-500">
          {withImage && <UserAvatar username={author} size="normal" />}
          <span className="hover:cursor-pointer hover:text-red-600">{author}</span>
        </div>
      </HoverCardTrigger>
      <span
        title={t('post_content.reputation_title')}
        className="mr-1 block font-normal"
        data-testid="author-reputation"
      >
        ({accountReputation(author_reputation)})
      </span>
      {blacklist && blacklist[0] ? (
        <span className="mr-1 text-red-600" title={blacklist[0]}>
          ({blacklist.length})
        </span>
      ) : null}
      <HoverCardContent className="w-72" data-testid="user-hover-card-content">
        <HoverCardData author={author} />
      </HoverCardContent>
    </HoverCard>
  );
}
