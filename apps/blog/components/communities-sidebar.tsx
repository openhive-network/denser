import Link from 'next/link';
import { Button } from '@hive/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { getCommunities } from '@/blog/lib/bridge';
import { cn } from '@/blog/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@hive/ui/components/card';
import { FC } from 'react';

const CommunitiesSidebar: FC = () => {
  const sort = 'rank';
  const query = null;
  const { isLoading, error, data } = useQuery(['communitiesList', sort, query], () =>
    getCommunities(sort, query)
  );

  if (isLoading) return <p>Loading...</p>;

  return (
    <Card
      className={cn('my-4 hidden h-fit w-full flex-col px-8 dark:bg-background/95 dark:text-white md:flex')}
      data-testid="card-trending-comunities"
    >
      <CardHeader className="px-0 py-4">
        <CardTitle>
          <Link href="/trending" className="hover:cursor-pointer hover:text-red-600">
            All posts
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-sm text-gray-400">Trending Communities</span>
        <ul>
          {data?.slice(0, 12).map((community) => (
            <li key={community.id}>
              <Link
                href={`/trending/${community.name}`}
                className="w-full text-sm font-light hover:cursor-pointer hover:text-red-600"
              >
                {community.title}
              </Link>
            </li>
          ))}
          <li className="py-4">
            <Link
              href={`/communities`}
              className="w-full text-sm font-medium hover:cursor-pointer hover:text-red-600"
            >
              Explore communities...
            </Link>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default CommunitiesSidebar;
