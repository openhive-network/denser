'use client';

import { useTranslation } from '@/blog/i18n/client';
import { Link } from '@hive/ui';
import { cn } from '@ui/lib/utils';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

type SortType = 'posts' | 'comments' | 'payout';

const SORT_TYPES: readonly SortType[] = ['posts', 'comments', 'payout'];

function isSortType(segment: string | undefined): segment is SortType {
  return SORT_TYPES.some((sort) => sort === segment);
}

// These are page routes, so they are links with aria-current rather than ARIA tabs
const AccountPostsTabs = ({ username, children }: { username: string; children: ReactNode }) => {
  const { t } = useTranslation('blog');
  const pathname = usePathname();
  const segment = pathname?.slice(pathname.lastIndexOf('/') + 1);
  const activeSort: SortType = isSortType(segment) ? segment : 'posts';
  const labels: Record<SortType, string> = {
    posts: t('navigation.profile_posts_tab_navbar.posts'),
    comments: t('navigation.profile_posts_tab_navbar.comments'),
    payout: t('navigation.profile_posts_tab_navbar.payouts')
  };

  return (
    <div className="w-full">
      <nav
        aria-label={t('navigation.profile_posts_tab_navbar.label')}
        className="flex h-10 items-center justify-start rounded-md bg-background-tertiary p-1 text-muted-foreground"
        data-testid="user-post-menu"
      >
        {SORT_TYPES.map((sort) => {
          const isActive = sort === activeSort;
          return (
            <Link
              key={sort}
              href={`/@${username}/${sort}`}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive && 'bg-background text-foreground shadow-xs'
              )}
            >
              {labels[sort]}
            </Link>
          );
        })}
      </nav>
      <div className="mt-2">{children}</div>
    </div>
  );
};

export default AccountPostsTabs;
