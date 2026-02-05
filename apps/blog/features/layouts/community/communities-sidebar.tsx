'use client';

import { Link } from '@hive/ui';
import { useQuery } from '@tanstack/react-query';
import { getCommunities } from '@transaction/lib/bridge-api';
import { cn } from '@ui/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@hive/ui/components/card';
import { FC } from 'react';
import { useTranslation } from '@/blog/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';
import { StaleTime } from '@/blog/lib/react-query';
import { useSSRObserver, useInitialCommunities } from '@/blog/components/observer-provider';

const CommunitiesSidebar: FC = () => {
  const { t } = useTranslation('common_blog');
  const sort = 'rank';
  const query = null;
  const ssrObserver = useSSRObserver();
  const initialCommunities = useInitialCommunities();
  const { user, isHydrated } = useUserClient();
  // Use SSR observer before hydration to match prefetched cache keys,
  // then switch to client observer (which should be the same value for logged-in users)
  const clientObserver = user.isLoggedIn ? user.username : DEFAULT_OBSERVER;
  const observer = isHydrated ? clientObserver : ssrObserver;

  const { data } = useQuery({
    queryKey: ['communitiesList', sort, query, observer],
    queryFn: () => getCommunities(sort, query, observer),
    initialData: initialCommunities ?? undefined,
    initialDataUpdatedAt: initialCommunities ? Date.now() : undefined,
    staleTime: StaleTime.LONG
  });

  // Only show a fallback if data is truly missing (not hydrated)
  if (!data) return null;

  return (
    <Card
      className={cn('my-4 hidden h-fit w-full flex-col bg-background px-8 text-primary md:flex')}
      data-testid="card-trending-comunities"
      translate="no"
    >
      <CardHeader className="px-0 py-4">
        <CardTitle>
          <Link href="/trending" className="hover:text-destructive">
            {t('navigation.communities_nav.all_posts')}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-sm text-gray-400">{t('navigation.communities_nav.trending_communities')}</span>
        <ul>
          {data?.slice(0, 12).map((community) => (
            <li key={community.id}>
              <Link
                href={`/trending/${community.name}`}
                className="w-full text-sm font-light hover:text-destructive"
              >
                {community.title}
              </Link>
            </li>
          ))}
          <li className="py-4">
            <Link
              href={`/communities`}
              className="w-full text-sm font-medium hover:text-destructive"
              data-testid="explore-communities-link"
            >
              {t('navigation.communities_nav.explore_communities')}
            </Link>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default CommunitiesSidebar;
