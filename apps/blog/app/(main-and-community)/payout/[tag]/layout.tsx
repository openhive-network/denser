import PrefetchComponent from '@/blog/features/layouts/community/prefetch-component';
import { ReactNode } from 'react';

const Layout = ({ children, params }: { children: ReactNode; params: { tag: string } }) => {
  return <PrefetchComponent community={params.tag}>{children}</PrefetchComponent>;
};
export default Layout;
