import { Link } from '@hive/ui';
import { Badge } from '@ui/components/badge';
import { Trans, useTranslation } from '@/blog/i18n/client';

import ChangeTitleDialog from '../community-profile/change-title-dialog';
import TimeAgo from '@hive/ui/components/time-ago';
import { UserPopoverCard, UserPopoverCardProps } from './user-popover-card';
import AuthorProfileLink from '../lite-account/author-profile-link';
import { authorDisplayName } from '../lite-account/lite-did';
import { useLocale } from '@ui/components/locale-context';
import { formatDateTime } from '@ui/lib/locale-format';

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
  const { locale } = useLocale();
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 py-2 text-sm" data-testid="author-data">
      <UserPopoverCard
        author={author}
        author_reputation={author_reputation}
        withImage
        blacklist={blacklist}
      />
      {author_title && (
        <Badge variant="outline" className="border-destructive text-slate-500" translate="no">
          <span className="mr-1">{author_title}</span>
          <ChangeTitleDialog
            permlink={permlink}
            community={community}
            moderateEnabled={moderateEnabled}
            userOnList={author}
            title={author_title ?? ''}
          />
        </Badge>
      )}
      {!author_title && (
        <ChangeTitleDialog
          permlink={permlink}
          community={community}
          moderateEnabled={moderateEnabled}
          userOnList={author}
          title=""
        />
      )}
      {authored && (
        <span className="text-muted-foreground">
          <Trans
            i18nKey="post_content.authored_by"
            values={{ author: authorDisplayName(authored) }}
            components={{
              // Trans fills in the children from the translation.
              author: (
                <AuthorProfileLink className="hover:cursor-pointer hover:text-destructive" author={authored}>
                  @{authorDisplayName(authored)}
                </AuthorProfileLink>
              )
            }}
          />
        </span>
      )}
      <span className="text-muted-foreground">{t('post_content.in')}</span>
      <Link
        href={`/trending/${community_title ? community : category}`}
        className="font-medium text-destructive hover:cursor-pointer hover:underline"
        data-testid={community_title ? 'comment-community-title' : 'comment-category-title'}
        translate="no"
      >
        {community_title || `#${category}`}
      </Link>
      <span className="text-muted-foreground">•</span>
      <span className="text-muted-foreground" title={formatDateTime(created, locale, 'weekdayDateYear', 'UTC')}>
        <TimeAgo date={created} />
      </span>
    </div>
  );
}

export default UserInfo;
