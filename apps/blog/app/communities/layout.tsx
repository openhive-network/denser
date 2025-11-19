import PageLayout from '@/blog/features/layouts/main-page-layout';
import ServerSideLayout from '@/blog/features/layouts/sorts/server-side-layout';
import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Communities',
};

const Layout = async ({ children }: { children: ReactNode }) => {
  return (
    <ServerSideLayout>
      <PageLayout hidePostsHeader={true}>{children}</PageLayout>
    </ServerSideLayout>
  );
};

export default Layout;
