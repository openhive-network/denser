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
  const sort: SortType = (pathname?.slice(pathname.lastIndexOf('/') + 1) as SortType) || 'posts';

  return (
    <Tabs defaultValue={sort} className="w-full">
      <TabsList className="flex justify-start bg-background-tertiary" data-testid="user-post-menu">
        <TabsTrigger value="posts">
          <Link href={`/@${username}/posts`}>{t('navigation.profile_posts_tab_navbar.posts')}</Link>
        </TabsTrigger>
        <TabsTrigger value="comments">
          <Link href={`/@${username}/comments`}>{t('navigation.profile_posts_tab_navbar.comments')}</Link>
        </TabsTrigger>
        <TabsTrigger value="payout">
          <Link href={`/@${username}/payout`}>{t('navigation.profile_posts_tab_navbar.payouts')}</Link>
        </TabsTrigger>
      </TabsList>
      <TabsContent value={sort}>{children}</TabsContent>
    </Tabs>
  );
};

export default AccountPostsTabs;
