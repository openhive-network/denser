import MainPageLayout from '@/blog/features/layouts/main-page-layout';
import ServerSideLayout from '@/blog/features/layouts/sorts/server-side-layout';
import { ReactNode } from 'react';

const tag = 'feed';

const Layout = ({ children }: { children: ReactNode }) => (
  <ServerSideLayout>
    <MainPageLayout tag={tag}>{children}</MainPageLayout>
  </ServerSideLayout>
);

export default Layout;
