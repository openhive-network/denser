import PrefetchComponent from '@/blog/features/layouts/community/prefetch-component';
import { ReactNode } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildCommunityTagMetadata } from '@/blog/features/layouts/community/lib/metadata';
import { isValidTagFormat, isCommunityFormat } from '@transaction/lib/validation';

export async function generateMetadata(props: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const params = await props.params;
  return buildCommunityTagMetadata(params, 'roles');
}
const Layout = async (props: { children: ReactNode; params: Promise<{ tag: string }> }) => {
  const params = await props.params;

  const {
    children
  } = props;

  const { tag } = params;

  // Validate: must be a valid tag or valid community name format
  if (!isCommunityFormat(tag) && !isValidTagFormat(tag)) {
    notFound();
  }

  return <PrefetchComponent community={tag}>{children}</PrefetchComponent>;
};
export default Layout;
