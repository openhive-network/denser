import MainPageLayout from '@/blog/features/layouts/main-page-layout';
import ServerSideLayout from '@/blog/features/layouts/sorts/server-side-layout';
import { ReactNode } from 'react';
import { Metadata } from 'next';
import { getTranslation } from '@/blog/i18n/server';
import { NOINDEX_ROBOTS } from '@/blog/lib/seo-robots';

const tag = 'feed';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation('common_blog');
  return {
    title: t('page_titles.my_friends'),
    robots: NOINDEX_ROBOTS
  };
}

const Layout = ({ children }: { children: ReactNode }) => (
  <ServerSideLayout>
    <MainPageLayout tag={tag}>{children}</MainPageLayout>
  </ServerSideLayout>
);

export default Layout;
