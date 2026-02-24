'use client';

import { ReactNode } from 'react';
import CommunitySimpleDescription from './community-simple-description';
import CommunitiesMyBar from '../communities-my-bar';
import CommunitiesSidebar from './communities-sidebar';
import { useQuery } from '@tanstack/react-query';
import {
  getAccountNotifications,
  getCommunity,
  getSubscribers,
  getSubscriptions
} from '@transaction/lib/bridge-api';
import CommunityDescription from './community-description';
import { CommunitiesSelect } from '@/blog/features/layouts/communities-select';
import PostSelectFilter from '@/blog/features/layouts/post-select-filter';
import { usePathname } from 'next/navigation';
import BasePathLink from '@/blog/components/base-path-link';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';
import { StaleTime } from '@/blog/lib/react-query';
import { useSSRObserver, useInitialCommunity, useInitialSubscriptions } from '@/blog/components/observer-provider';
import { t } from 'i18next';
import { Skeleton } from '@hive/ui';

const CommunityLayout = ({ children, community }: { children: ReactNode; community: string }) => {
  const { user, isHydrated } = useUserClient();
  const pathname = usePathname();
  const ssrObserver = useSSRObserver();
  const initialCommunity = useInitialCommunity();
  const initialSubscriptions = useInitialSubscriptions();
  const clientObserver = user.isLoggedIn ? user.username : DEFAULT_OBSERVER;
  const observer = isHydrated ? clientObserver : ssrObserver;
  const isRolesPage = pathname?.includes('/roles/');
  const isCommunity = community?.startsWith('hive-');
  const { data: subsData } = useQuery({
    queryKey: ['subscribers', community],
    queryFn: () => getSubscribers(community ?? ''),
    enabled: isCommunity
  });
  const { data: notificationData } = useQuery({
    queryKey: ['AccountNotification', community],
    queryFn: () => getAccountNotifications(community ?? ''),
    enabled: isCommunity
  });

  const { data: mySubsData } = useQuery({
    queryKey: ['subscriptions', observer],
    queryFn: () => getSubscriptions(observer),
    enabled: observer !== DEFAULT_OBSERVER,
    initialData: initialSubscriptions ?? undefined,
    initialDataUpdatedAt: initialSubscriptions ? Date.now() : undefined,
    staleTime: StaleTime.LONG
  });

  // Only use SSR initial data when the observer hasn't changed after hydration.
  // If SSR used DEFAULT_OBSERVER ('hive.blog') but the client has a logged-in user,
  // the initial data has context.subscribed=false for the wrong observer — discard it
  // so React Query refetches with the correct observer.
  const observerMatchesSSR = observer === ssrObserver;
  const useInitialData = initialCommunity && observerMatchesSSR;

  const { data: communityData, isLoading: isCommunityLoading } = useQuery({
    queryKey: ['community', community, observer],
    queryFn: () => getCommunity(community, observer),
    enabled: isCommunity,
    initialData: useInitialData ? initialCommunity : undefined,
    initialDataUpdatedAt: useInitialData ? Date.now() : undefined,
    staleTime: StaleTime.LONG
  });

  return (
    <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2">
      <div className="grid grid-cols-12 md:gap-4">
        <div className="hidden md:col-span-3 md:flex xl:col-span-2">
          {!!mySubsData ? <CommunitiesMyBar data={mySubsData} /> : <CommunitiesSidebar />}
        </div>
        <div className="col-span-12 md:col-span-9 xl:col-span-8">
          <div data-testid="card-explore-hive-mobile" className="md:col-span-10 md:flex xl:hidden">
            {communityData && subsData ? (
              <CommunitySimpleDescription
                data={communityData}
                subs={subsData}
                username={community}
                notificationData={notificationData}
                userSubscriptions={mySubsData}
              />
            ) : null}
          </div>

          <div className="col-span-12 mb-5 flex flex-col md:col-span-10 lg:col-span-8">
            <div className="my-4 flex w-full items-center justify-between" translate="no">
              <div className="mr-2 flex w-[320px] flex-col">
                {isRolesPage ? (
                  <BasePathLink href={`/trending/${community}`}>
                    <span
                      className="text-md ml-10 font-medium text-destructive"
                      data-testid="community-name"
                    >
                      {isCommunity && isCommunityLoading ? (
                        <Skeleton className="inline-block h-6 w-48" />
                      ) : (
                        communityData?.title || `#${community}`
                      )}
                    </span>
                  </BasePathLink>
                ) : (
                  <>
                    <span className="text-md hidden font-medium md:block" data-testid="community-name">
                      {isCommunity && isCommunityLoading ? (
                        <Skeleton className="inline-block h-6 w-48" />
                      ) : (
                        communityData?.title || `#${community}`
                      )}
                    </span>
                    <span className="md:hidden">
                      <CommunitiesSelect title={isCommunity && isCommunityLoading ? '' : (communityData?.title || community)} />
                    </span>

                      <span
                        className="hidden text-xs font-light md:block"
                        data-testid="community-name-unmoderated"
                      >
                        {isCommunity && isCommunityLoading ? (
                          <Skeleton className="inline-block h-4 w-32" />
                        ) : communityData ? (
                          t('communities.community')
                        ) : (
                          t('communities.unmoderated_tag')
                        )}
                      </span>

                  </>
                )}
              </div>

              {isRolesPage ? null : (
                <div className="w-[180px]">
                  <PostSelectFilter param={`/${community}`} />
                </div>
              )}
            </div>
            {children}
          </div>
        </div>
        <div data-testid="card-explore-hive-desktop" className="hidden xl:col-span-2 xl:flex">
          {!community && !communityData ? (
            <CommunitiesSidebar />
          ) : communityData && subsData ? (
            <CommunityDescription
              data={communityData}
              subs={subsData}
              notificationData={notificationData}
              username={community ?? ''}
              userSubscriptions={mySubsData}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};
export default CommunityLayout;
