'use client';

import { Badge } from '@hive/ui';
import { Link } from '@hive/ui';
import { useTranslation } from '@/blog/i18n/client';
import { communityRoleLabel } from '@/blog/features/community-profile/lib/utils';

const SubscriptionListItem = ({ community }: { community: string[] }) => {
  const { t } = useTranslation('common_blog');
  return (
    <li data-testid="author-community-subscribed-list-item">
      <Link
        href={`/trending/${community[0]}`}
        className="mr-2 text-destructive hover:underline"
        data-testid="author-community-subscribed-link"
      >
        {community[1] ? community[1] : community[0]}
      </Link>
      <span className="text-sm font-light uppercase opacity-60" data-testid="author-role-community">
        {communityRoleLabel(community[2], t)}
      </span>
      {community[3] ? (
        <Badge
          variant="outline"
          className="ml-1 border-destructive text-slate-500"
          data-testid="author-affiliation-tag"
        >
          {community[3]}
        </Badge>
      ) : null}
    </li>
  );
};

export default SubscriptionListItem;
