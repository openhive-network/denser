import Link from 'next/link';
import parseDate, { dateToFullRelative } from '@ui/lib/parse-date';
import { Badge } from '@ui/components/badge';
import { useTranslation } from 'next-i18next';
import { UserPopoverCard, UserPopoverCardProps } from './user-popover-card';

interface UserInfoProps extends UserPopoverCardProps {
  authored?: string;
  community_title: string;
  community: string;
  category: string;
  created: string;
  author_title?: string;
  blacklist: string[];
}

function UserInfo({
  authored,
  community,
  community_title,
  category,
  created,
  author,
  author_reputation,
  author_title,
  blacklist
}: UserInfoProps) {
  const { t } = useTranslation('common_blog');
  return (
    <div className="flex flex-col py-4 text-slate-500 dark:text-slate-400" data-testid="author-data">
      <div className="flex flex-wrap items-center">
        <UserPopoverCard
          author={author}
          author_reputation={author_reputation}
          withImage
          blacklist={blacklist}
        />
        {author_title ? (
          <Badge variant="outline" className="mr-1 border-red-600 text-slate-500" translate="no">
            {author_title}
          </Badge>
        ) : null}
        {t('post_content.in')}
        <span className="ml-1" translate="no">
          {community_title ? (
            <Link
              href={`/trending/${community}`}
              className="hover:cursor-pointer hover:text-red-600"
              data-testid="comment-community-title"
            >
              {community_title}
            </Link>
          ) : (
            <Link
              href={`/trending/${category}`}
              className="hover:cursor-pointer hover:text-red-600"
              data-testid="comment-category-title"
            >
              #{category}
            </Link>
          )}
        </span>
        <span className="mx-1" translate="no">
          •
        </span>
        <span title={String(parseDate(created))}>{dateToFullRelative(created, t)}</span>
      </div>
      {authored ? (
        <span className="ml-1 text-xs">
          Authored by{' '}
          <Link className="hover:cursor-pointer hover:text-red-500" href={`/@${authored}`}>
            @{authored}
          </Link>
        </span>
      ) : null}
    </div>
  );
}

export default UserInfo;
