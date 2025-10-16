import PageLayout from '@/blog/features/layouts/main-page-layout';
import { ReactNode } from 'react';

const Layout = ({ children }: { children: ReactNode }) => {
  return <PageLayout hidePostsHeader={true}>{children}</PageLayout>;
};

export default Layout;
