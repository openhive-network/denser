'use client';

import ProfileLayout from '@/blog/components/common/profile-layout';
import CommunitiesMybar from '@/blog/components/communities-mybar';
import CommunitiesSidebar from '@/blog/components/communities-sidebar';
import ExploreHive from '@/blog/components/explore-hive';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useParams } from 'next/navigation';
import { ReactNode } from 'react';

const Layout = ({ children }: { children: ReactNode }) => {
  const { param, param2 } = useParams() as { param: string; param2: string };
  const profilePage = param.includes('%40');
  const postPages = param2 ? param2.includes('hive-') : true;
  const { user } = useUserClient();
  return profilePage ? (
    <ProfileLayout>{children}</ProfileLayout>
  ) : postPages ? (
    <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2">
      <div className="grid grid-cols-12 md:gap-4">
        <div className="hidden md:col-span-3 md:flex xl:col-span-2">
          {user?.isLoggedIn ? <CommunitiesMybar username={user.username} /> : <CommunitiesSidebar />}
        </div>
        <div className="col-span-12 py-4 md:col-span-9 xl:col-span-8">{children}</div>
        <div data-testid="card-explore-hive-desktop" className="hidden xl:col-span-2 xl:flex">
          {user?.isLoggedIn ? <CommunitiesSidebar /> : <ExploreHive />}
        </div>
      </div>
    </div>
  ) : (
    children
  );
};

export default Layout;
