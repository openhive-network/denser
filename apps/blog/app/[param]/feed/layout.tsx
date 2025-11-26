import MainPageLayout from '@/blog/features/layouts/main-page-layout';
import ServerSideLayout from '@/blog/features/layouts/sorts/server-side-layout';
import { ReactNode } from 'react';
import { Metadata } from 'next';

const tag = 'feed';

export const metadata: Metadata = {
  title: 'My Friends'
};

const Layout = ({ children }: { children: ReactNode }) => (
  <ServerSideLayout>
    <MainPageLayout tag={tag}>{children}</MainPageLayout>
  </ServerSideLayout>
);

export default Layout;
