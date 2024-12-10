'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getCommunities } from '@transaction/lib/bridge';
import { cn } from '@ui/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@hive/ui/components/card';
import { FC } from 'react';
import { useTranslation } from '../i18n/client';

const CommunitiesSidebar: FC = () => {
  const { t } = useTranslation('common_blog');
  const sort = 'rank';
  const query = null;
  const { isLoading, error, data } = useQuery(['communitiesList', sort, query], () =>
    getCommunities(sort, query)
  );

  if (isLoading) return <p>{t('global.loading')}...</p>;

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
