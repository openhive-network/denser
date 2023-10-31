import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getCommunities } from '@/blog/lib/bridge';
import { cn } from '@/blog/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@hive/ui/components/card';
import { FC } from 'react';
import { useTranslation } from 'next-i18next';

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
      className={cn('my-4 hidden h-fit w-full flex-col dark:bg-background/95 dark:text-white md:flex')}
      data-testid="card-trending-comunities"
    >
      <CardContent className='p-0'>
        <span className="font-bold flex gap-2 p-2 bg-slate-950 text-white">
          {t('navigation.communities_nav.trending_communities')}
        </span>
        <ul className='text-sm'>
          {data?.slice(0, 12).map((community) => (
            <li className="font-semibold flex gap-2 hover:bg-slate-900 hover:text-red-500" key={community.id}>
              <Link
                href={`/trending/${community.name}`}
                className='w-full h-full px-4 py-1'
              >
                {community.title}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default CommunitiesSidebar;
