import MainPageLayout from '@/blog/features/layouts/main-page-layout';
import ServerSideLayout from '@/blog/features/layouts/sorts/server-side-layout';
import { Metadata } from 'next';
import { ReactNode } from 'react';
import { getTranslation } from '@/blog/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation('common_blog');
  return {
    title: t('page_titles.communities')
  };
}

const Layout = async ({ children }: { children: ReactNode }) => {
  return (
    <ServerSideLayout>
      <MainPageLayout hidePostsHeader={true}>{children}</MainPageLayout>
    </ServerSideLayout>
  );
};

export default Layout;
