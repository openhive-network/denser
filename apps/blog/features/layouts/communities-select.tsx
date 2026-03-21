'use client';

import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/blog/i18n/client';
import { withBasePath } from '@ui/lib/path-utils';
import { getCommunities, getSubscriptions } from '@transaction/lib/bridge-api';
import { useRouter } from 'next/navigation';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';
import { StaleTime } from '@/blog/lib/react-query';
import { useSSRObserver, useInitialCommunities, useInitialSubscriptions } from '@/blog/components/observer-provider';

export function CommunitiesSelect({ title }: { title: string }) {
  const { user, isHydrated } = useUserClient();
  const router = useRouter();
  const { t } = useTranslation('common_blog');
  const ssrObserver = useSSRObserver();
  const initialCommunities = useInitialCommunities();
  const initialSubscriptions = useInitialSubscriptions();
  const clientObserver = user.isLoggedIn ? user.username : DEFAULT_OBSERVER;
  const observer = isHydrated ? clientObserver : ssrObserver;
  const sort = 'rank';
  const query = null;

  const { isLoading, data } = useQuery({
    queryKey: ['communitiesList', sort, query, observer],
    queryFn: () => getCommunities(sort, query, observer),
    initialData: initialCommunities ?? undefined,
    initialDataUpdatedAt: initialCommunities ? Date.now() : undefined,
    staleTime: StaleTime.LONG
  });
  const { data: mySubsData } = useQuery({
    queryKey: ['subscriptions', observer],
    queryFn: () => getSubscriptions(observer),
    enabled: observer !== DEFAULT_OBSERVER,
    initialData: initialSubscriptions ?? undefined,
    initialDataUpdatedAt: initialSubscriptions ? Date.now() : undefined,
    staleTime: StaleTime.LONG
  });
  const filteredCommunity = data
    ?.slice(0, 12)
    .filter((c) => !mySubsData?.map((my) => my[0]).includes(c.name));

  if (isLoading) return <p>{t('global.loading')}...</p>;
  return (
    <Select
      onValueChange={(e) => {
        if (e === 'communities') {
          router.push(withBasePath('/communities'));
        } else if (e.startsWith('/') || e.startsWith('@')) {
          router.push(withBasePath(e));
        } else {
          router.push(withBasePath(`/trending/${e}`));
        }
      }}
    >
      <SelectTrigger className="bg-white dark:bg-background/95 dark:text-white">
        <SelectValue placeholder={title} />
      </SelectTrigger>
      <SelectContent
        className="max-h-96 overflow-y-auto"
        ref={(ref) => {
          if (!ref) return;
          ref.ontouchstart = (e) => {
            e.preventDefault();
          };
        }}
      >
        <SelectGroup>
          <SelectItem value="/trending">{t('navigation.communities_nav.all_posts')}</SelectItem>
        </SelectGroup>
        {user.isLoggedIn && (
          <SelectGroup>
            <SelectItem value={`/@${user.username}/feed`}>My friends</SelectItem>
            <SelectItem value="/trending/my">My communities</SelectItem>
            {mySubsData && mySubsData.length > 0 ? (
              <SelectItem disabled value="my-communities" className="text-slate-400">
                My communities
              </SelectItem>
            ) : null}
            {mySubsData && mySubsData.length > 0
              ? mySubsData?.map((e) => (
                  <SelectItem key={e[0]} value={e[0]}>
                    {e[1]}
                  </SelectItem>
                ))
              : null}
          </SelectGroup>
        )}
        <SelectGroup>
          <SelectItem disabled value="trending-communities" className="text-slate-400">
            {t('navigation.communities_nav.trending_communities')}
          </SelectItem>
          {user && user.isLoggedIn
            ? filteredCommunity?.slice(0, 12).map((community) => (
                <SelectItem key={community.id} value={community.name}>
                  {community.title}
                </SelectItem>
              ))
            : data?.slice(0, 12).map((community) => (
                <SelectItem key={community.id} value={community.name}>
                  {community.title}
                </SelectItem>
              ))}
          <SelectItem value="communities">{t('navigation.communities_nav.explore_communities')}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
