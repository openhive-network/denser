import ClientSideLayout from '@/blog/features/layouts/sorts/client-side-layout';
import ServerSideLayout from '@/blog/features/layouts/sorts/server-side-layout';
import { ReactNode } from 'react';
import { Metadata } from 'next';
import { getTranslation } from '@/blog/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation('common_blog');
  return {
    title: {
      default: t('page_titles.blog'),
      template: '%s - Hive'
    }
  };
}

// No loading.tsx in this group: React 19 streams a Suspense boundary whose content
// would push the flushed HTML past its progressive chunk size (~12.8 KB) as a hidden
// segment that only client JS reveals, so a route-level boundary would keep the feed
// out of the visible server HTML (ssrChecks SSR-01/02/08).
const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <ServerSideLayout>
      <ClientSideLayout>{children}</ClientSideLayout>
    </ServerSideLayout>
  );
};
export default Layout;
