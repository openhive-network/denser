import { buildCommunityTagMetadata } from '@/blog/features/layouts/community/lib/metadata';
import PrefetchComponent from '@/blog/features/layouts/community/prefetch-component';
import { Metadata } from 'next';
import { ReactNode } from 'react';

export async function generateMetadata({
  params
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  return buildCommunityTagMetadata(resolvedParams, 'roles');
}
const Layout = async ({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ tag: string }>;
}) => {
  const { tag } = await params;
  return <PrefetchComponent community={tag}>{children}</PrefetchComponent>;
};
export default Layout;
