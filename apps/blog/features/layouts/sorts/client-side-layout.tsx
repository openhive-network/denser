'use client';

import MainPageLayout from '@/blog/features/layouts/main-page-layout';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const ClientSideLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const params = pathname?.split('/');
  const tag = params?.[2];

  if (!tag || tag === 'my') {
    return <MainPageLayout tag={tag}>{children}</MainPageLayout>;
  } else {
    return children;
  }
};
export default ClientSideLayout;
