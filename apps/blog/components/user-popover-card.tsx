import UserAvatar from '@/blog/components/user-avatar';
import accountReputation from '@/blog/lib/account-reputation';
import { HoverCardData } from './hover-card-data';
import { useTranslation } from 'next-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/components/popover';

export interface UserPopoverCardProps {
  author: string;
  author_reputation: number;
  blacklist: string[];
  withImage?: boolean;
}

export function UserPopoverCard({
  author,
  author_reputation,
  blacklist,
  withImage = false
}: UserPopoverCardProps) {
  const { t } = useTranslation('common_blog');
  return (
    <Popover>
      <PopoverTrigger data-testid="author-name-link">
        <div className="flex items-center pl-1 font-bold hover:cursor-pointer hover:text-red-500">
          {withImage && <UserAvatar username={author} size="normal" />}
          <span className="hover:cursor-pointer hover:text-red-600">{author}</span>
        </div>
      </PopoverTrigger>
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
      <PopoverContent className="w-72" data-testid="user-popover-card-content">
        <HoverCardData author={author} blacklist={blacklist} />
      </PopoverContent>
    </Popover>
  );
}
