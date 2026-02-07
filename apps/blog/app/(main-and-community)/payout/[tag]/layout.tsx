import PrefetchComponent from '@/blog/features/layouts/community/prefetch-component';
import { ReactNode } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildCommunityTagMetadata } from '@/blog/features/layouts/community/lib/metadata';
import { isValidTagFormat, isCommunityFormat } from '@transaction/lib/validation';

export async function generateMetadata({ params }: { params: { tag: string } }): Promise<Metadata> {
  return buildCommunityTagMetadata(params, 'pending');
}
const Layout = ({ children, params }: { children: ReactNode; params: { tag: string } }) => {
  const { tag } = params;

  // Validate: must be a valid tag or valid community name format
  if (!isCommunityFormat(tag) && !isValidTagFormat(tag)) {
    notFound();
  }

  return <PrefetchComponent community={tag}>{children}</PrefetchComponent>;
};
export default Layout;
