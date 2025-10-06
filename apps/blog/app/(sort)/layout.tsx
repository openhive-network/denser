import PageLayout from '@/blog/features/sorts-pages/page-layout';
import { ReactNode } from 'react';

const Layout = ({ children }: { children: ReactNode }) => {
  return <PageLayout>{children}</PageLayout>;
};
export default Layout;
