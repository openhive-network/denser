'use client';

import MainPageLayout from '@/blog/features/layouts/main-page-layout';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { FeedNavigationProvider } from './feed-navigation-context';

const ClientSideLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const params = pathname?.split('/');
  const tag = params?.[2];

  return (
    <FeedNavigationProvider>
      {!tag || tag === 'my' ? <MainPageLayout tag={tag}>{children}</MainPageLayout> : children}
    </FeedNavigationProvider>
  );
};
export default ClientSideLayout;
