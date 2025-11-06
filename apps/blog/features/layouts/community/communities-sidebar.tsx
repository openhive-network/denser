'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getCommunities } from '@transaction/lib/bridge-api';
import { cn } from '@ui/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@hive/ui/components/card';
import { FC } from 'react';
import { useTranslation } from '@/blog/i18n/client';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';

const CommunitiesSidebar: FC = () => {
  const { t } = useTranslation('common_blog');
  const sort = 'rank';
  const query = null;
  const { user } = useUser();
  const observer = user.isLoggedIn ? user.username : DEFAULT_OBSERVER;

  const { data } = useQuery({
    queryKey: ['communitiesList', sort],
    queryFn: () => getCommunities(sort, query, observer)
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
