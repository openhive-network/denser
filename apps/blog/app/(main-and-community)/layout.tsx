'use client';

import CommunityLayout from '@/blog/features/layouts/community/community-layout';
import PageLayout from '@/blog/features/layouts/main-page-layout';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const Layout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const params = pathname?.split('/');
  const tag = params?.[2];

  if (tag?.startsWith('hive-')) {
    return <CommunityLayout community={tag}>{children}</CommunityLayout>;
  } else {
    return <PageLayout tag={tag}>{children}</PageLayout>;
  }
};
export default Layout;
