import PageLayout from '@/blog/features/layouts/main-page-layout';
import { ReactNode } from 'react';

const tag = 'feed';

const Layout = ({ children }: { children: ReactNode }) => <PageLayout tag={tag}>{children}</PageLayout>;

export default Layout;
