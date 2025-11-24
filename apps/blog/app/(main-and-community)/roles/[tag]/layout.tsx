import { buildCommunityTagMetadata } from '@/blog/features/layouts/community/lib/metadata';
import PrefetchComponent from '@/blog/features/layouts/community/prefetch-component';
import { Metadata } from 'next';
import { ReactNode } from 'react';

export async function generateMetadata({ params }: { params: { tag: string } }): Promise<Metadata> {
  return buildCommunityTagMetadata(params, 'roles');
}
const Layout = ({ children, params }: { children: ReactNode; params: { tag: string } }) => {
  return <PrefetchComponent community={params.tag}>{children}</PrefetchComponent>;
};
export default Layout;
