'use client';
import Link from 'next/link';
import parseDate, { dateToFullRelative } from '@ui/lib/parse-date';
import { Badge } from '@ui/components/badge';
import { UserPopoverCardProps } from '@/blog/components/user-popover-card';
import { useTranslation } from '@/blog/i18n/client';

interface UserInfoProps extends UserPopoverCardProps {
  permlink: string;
  moderateEnabled: boolean;
  authored?: string;
  community_title: string;
  community: string;
  category: string;
  created: string;
  author_title?: string;
  blacklist: string[];
}

function UserInfo({
  permlink,
  moderateEnabled,
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
        {/* <UserPopoverCard
          author={author}
          author_reputation={author_reputation}
          withImage
          blacklist={blacklist}
        />
        {author_title ? (
          <Badge variant="outline" className="mr-1 border-destructive text-slate-500" translate="no">
            <span className="mr-1">{author_title}</span>
            <ChangeTitleDialog
              permlink={permlink}
              community={community}
              moderateEnabled={moderateEnabled}
              userOnList={author}
              title={author_title ?? ''}
            />
          </Badge>
        ) : (
          <ChangeTitleDialog
            permlink={permlink}
            community={community}
            moderateEnabled={moderateEnabled}
            userOnList={author}
            title={author_title ?? ''}
          />
        )} */}
        {t('post_content.in')}
        <span className="ml-1" translate="no">
          {community_title ? (
            <Link
              href={`/trending/${community}`}
              className="hover:cursor-pointer hover:text-destructive"
              data-testid="comment-community-title"
            >
              {community_title}
            </Link>
          ) : (
            <Link
              href={`/trending/${category}`}
              className="hover:cursor-pointer hover:text-destructive"
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
          <Link className="hover:cursor-pointer hover:text-destructive" href={`/@${authored}`}>
            @{authored}
          </Link>
        </span>
      ) : null}
    </div>
  );
}

export default UserInfo;
