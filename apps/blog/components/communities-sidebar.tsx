import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getCommunities } from '@/blog/lib/bridge';
import { cn } from '@/blog/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@hive/ui/components/card';
import { FC } from 'react';
import { useTranslation } from 'next-i18next';
import CommunityListItem from './community-list-item';

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
      className={cn('my-4 py-3 xl:pt-0 h-fit w-full flex-col dark:bg-background/95 dark:text-white')}
      data-testid="card-trending-comunities"
    >
      <CardContent className='p-0'>
        <span className="font-bold gap-2 text-center p-3 bg-slate-950 text-white hidden xl:block ">
          {t('navigation.communities_nav.trending_communities')}
        </span>
        <ul className='text-sm'>
          {data?.slice(0, 12).map((community) => (
           <CommunityListItem community={community} key={community.id}/>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default CommunitiesSidebar;
