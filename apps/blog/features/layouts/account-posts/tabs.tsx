'use client';

import { useTranslation } from '@/blog/i18n/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/tabs';
import { Link } from '@hive/ui';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

type SortType = 'posts' | 'comments' | 'payout';

const AccountPostsTabs = ({ username, children }: { username: string; children: ReactNode }) => {
  const { t } = useTranslation('blog');
  const pathname = usePathname();
  const SORT_TYPES: readonly SortType[] = ['posts', 'comments', 'payout'];
  const segment = pathname?.slice(pathname.lastIndexOf('/') + 1);
  const sort: SortType = SORT_TYPES.includes(segment as SortType) ? (segment as SortType) : 'posts';

  return (
    <Tabs value={sort} className="w-full">
      <TabsList className="flex justify-start bg-background-tertiary" data-testid="user-post-menu">
        <TabsTrigger value="posts" className="p-0">
          <Link className="rounded-sm px-3 py-1.5" href={`/@${username}/posts`}>
            {t('navigation.profile_posts_tab_navbar.posts')}
          </Link>
        </TabsTrigger>
        <TabsTrigger value="comments" className="p-0">
          <Link className="rounded-sm px-3 py-1.5" href={`/@${username}/comments`}>
            {t('navigation.profile_posts_tab_navbar.comments')}
          </Link>
        </TabsTrigger>
        <TabsTrigger value="payout" className="p-0">
          <Link className="rounded-sm px-3 py-1.5" href={`/@${username}/payout`}>
            {t('navigation.profile_posts_tab_navbar.payouts')}
          </Link>
        </TabsTrigger>
      </TabsList>
      <TabsContent value={sort}>{children}</TabsContent>
    </Tabs>
  );
};

export default AccountPostsTabs;
