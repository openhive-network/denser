import UserAvatar from '@/blog/components/user-avatar';
import accountReputation from '@/blog/lib/account-reputation';
import { useTranslation } from 'next-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/components/popover';
import { PopoverCardData } from './popover-card-data';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useFollowListQuery } from './hooks/use-follow-list';

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
  const { user } = useUser();
  const { data: userBlacklist } = useFollowListQuery(user.username, 'blacklisted');
  const userBlacklisted = userBlacklist?.map((e) => e.name).includes(author);

  return (
    <Popover>
      <PopoverTrigger data-testid="author-name-link">
        <div className="flex items-center pl-1 font-bold hover:cursor-pointer hover:text-destructive">
          {withImage && <UserAvatar username={author} size="normal" />}
          <span className="hover:cursor-pointer hover:text-destructive">{author}</span>
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
        <span className="mr-1 text-destructive" title={blacklist[0]}>
          ({blacklist.length})
        </span>
      ) : null}
      {userBlacklisted ? (
        <span className="text-destructive" title="My blacklist">
          (1)
        </span>
      ) : null}
      <PopoverContent className="w-72 bg-background" data-testid="user-popover-card-content">
        <PopoverCardData author={author} blacklist={blacklist} />
      </PopoverContent>
    </Popover>
  );
}
