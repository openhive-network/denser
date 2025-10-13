'use client';

import { ReactNode } from 'react';
import CommunitiesMybar from '../../components/communities-mybar';
import CommunitiesSidebar from '../../components/communities-sidebar';
import { useUser } from '@smart-signer/lib/auth/use-user';
import ExploreHive from '@/blog/components/explore-hive';
import { useTranslation } from '@/blog/i18n/client';
import { CommunitiesSelect } from '@/blog/components/communities-select';
import PostSelectFilter from '@/blog/components/post-select-filter';

const PageLayout = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const { t } = useTranslation('common_blog');

  return (
    <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2">
      <div className="grid grid-cols-12 md:gap-4">
        <div className="hidden md:col-span-3 md:flex xl:col-span-2">
          {!!user.isLoggedIn ? <CommunitiesMybar /> : <CommunitiesSidebar />}
        </div>
        <div className="col-span-12 md:col-span-9 xl:col-span-8">
          <div className="col-span-12 mb-5 flex flex-col md:col-span-10 lg:col-span-8">
            <div className="my-4 flex w-full items-center justify-between" translate="no">
              <div className="mr-2 flex w-[320px] flex-col">
                <span className="text-md hidden font-medium md:block" data-testid="community-name">
                  {t('navigation.communities_nav.all_posts')}
                </span>
                <span className="md:hidden">
                  <CommunitiesSelect title={t('navigation.communities_nav.all_posts')} />
                </span>
              </div>
              <div className="w-[180px]">
                <PostSelectFilter />
              </div>
            </div>
            {children}
          </div>
        </div>
        <div data-testid="card-explore-hive-desktop" className="hidden xl:col-span-2 xl:flex">
          {!!user.isLoggedIn ? <CommunitiesSidebar /> : <ExploreHive />}
        </div>
      </div>
    </div>
  );
};
export default PageLayout;
