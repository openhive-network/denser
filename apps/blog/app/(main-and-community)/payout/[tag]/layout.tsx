import PrefetchComponent from '@/blog/features/layouts/community/prefetch-component';
import { ReactNode } from 'react';
import { Metadata } from 'next';
import { buildCommunityTagMetadata } from '@/blog/features/layouts/community/lib/metadata';

export async function generateMetadata({ params }: { params: { tag: string } }): Promise<Metadata> {
  return buildCommunityTagMetadata(params, 'pending');
}
const Layout = ({ children, params }: { children: ReactNode; params: { tag: string } }) => {
  return <PrefetchComponent community={params.tag}>{children}</PrefetchComponent>;
};
export default Layout;
