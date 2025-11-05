import PageLayout from '@/blog/features/layouts/main-page-layout';
import ServerSideLayout from '@/blog/features/layouts/sorts/server-side-layout';
import { ReactNode } from 'react';

const Layout = async ({ children }: { children: ReactNode }) => {
  return (
    <ServerSideLayout>
      <PageLayout hidePostsHeader={true}>{children}</PageLayout>
    </ServerSideLayout>
  );
};

export default Layout;
