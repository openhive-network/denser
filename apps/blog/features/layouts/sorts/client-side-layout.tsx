'use client';

import PageLayout from '@/blog/features/layouts/main-page-layout';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const ClientSideLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const params = pathname?.split('/');
  const tag = params?.[params.length - 1];

  if (tag?.startsWith('hive-')) {
    return children;
  } else {
    return <PageLayout tag={tag}>{children}</PageLayout>;
  }
};
export default ClientSideLayout;
