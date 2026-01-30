import PrefetchComponent from '@/blog/features/layouts/community/prefetch-component';
import { ReactNode } from 'react';
import { Metadata } from 'next';
import { buildCommunityTagMetadata } from '@/blog/features/layouts/community/lib/metadata';

export async function generateMetadata({
  params
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  return buildCommunityTagMetadata(resolvedParams, 'muted');
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
