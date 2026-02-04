import UserAvatar from '@/blog/features/post-rendering/user-avatar';
import { accountReputation } from '@hive/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/components/popover';
import PopoverCardData from './popover-card-data';
import { useTranslation } from '@/blog/i18n/client';
import { AlertTriangle } from 'lucide-react';

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
      <PopoverTrigger data-testid="author-name-link" asChild>
        <button className="flex items-center gap-1 hover:cursor-pointer">
          {withImage && <UserAvatar username={author} size="normal" />}
          <span className="font-semibold text-foreground hover:text-destructive">{author}</span>
          <span
            title={t('post_content.reputation_title')}
            className="text-muted-foreground"
            data-testid="author-reputation"
          >
            ({accountReputation(author_reputation)})
          </span>
          {blacklist && blacklist[0] ? (
            <span title={blacklist[0]}>
              <AlertTriangle className="ml-1 h-4 w-4 text-destructive" />
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 border border-border bg-background p-0 shadow-lg" data-testid="user-popover-card-content">
        <PopoverCardData author={author} blacklist={blacklist} authorReputation={author_reputation} />
      </PopoverContent>
    </Popover>
  );
}
