'use client';

import { ReactNode } from 'react';
import CommunitiesMyBar from './communities-my-bar';
import CommunitiesSidebar from './community/communities-sidebar';
import ExploreHive from '@/blog/features/layouts/explore-hive';
import { useTranslation } from '@/blog/i18n/client';
import { CommunitiesSelect } from '@/blog/features/layouts/communities-select';
import PostSelectFilter from '@/blog/features/layouts/post-select-filter';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { getSubscriptions } from '@transaction/lib/bridge-api';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@ui/components';

const PageLayout = ({
  children,
  tag = '',
  hidePostsHeader = false
}: {
  children: ReactNode;
  tag?: string;
  hidePostsHeader?: boolean;
}) => {
  const { user } = useUserClient();
  const { t } = useTranslation('common_blog');
  const { data, isFetching, status} = useQuery({
    queryKey: ['subscriptions', user.username],
    queryFn: () => getSubscriptions(user.username),
    enabled: user.isLoggedIn && !!user?.username
  });

  const renderCommunitiesSidebar = () =>{
    if (isFetching)
    return (
      <Skeleton className="h-32 w-full bg-slate-300 dark:bg-slate-900" />
    );
    if (!!data)
    return (
      <CommunitiesMyBar data={data} />
    );
    return <CommunitiesSidebar />
  }

  return (
    <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2">
      <div className="grid grid-cols-12 md:gap-4">
        <div className="hidden md:col-span-3 md:flex xl:col-span-2">
          {renderCommunitiesSidebar()}
        </div>
        <div className="col-span-12 md:col-span-9 xl:col-span-8">
          <div className="col-span-12 mb-5 flex flex-col md:col-span-10 lg:col-span-8">
            {hidePostsHeader ? null : (
              <div className="my-4 flex w-full items-center justify-between" translate="no">
                <div className="mr-2 flex w-[320px] flex-col">
                  <span className="text-md hidden font-medium md:block" data-testid="community-name">
                    {!!tag && t('navigation.communities_nav.all_posts')}
                  </span>
                  <span className="md:hidden">
                    <CommunitiesSelect title={t('navigation.communities_nav.all_posts')} />
                  </span>
                </div>
                <div className="w-[180px]">
                  <PostSelectFilter param={''} />
                </div>
              </div>
            )}
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
