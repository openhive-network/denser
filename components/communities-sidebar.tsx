import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { getCommunities } from '@/lib/bridge';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      className={cn(
        'my-4 hidden h-fit w-[300px] flex-col px-8 dark:bg-background/95 dark:text-white md:flex'
      )}
    >
      <CardHeader>
        <CardTitle className="px-2">Trending Communities</CardTitle>
      </CardHeader>
      <CardContent>
        <ul>
          {data?.slice(0, 12).map((community) => (
            <li key={community.id}>
              <Link href={`/trending/${community.name}`}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  {community.title}
                </Button>
              </Link>
            </li>
          ))}
          <li>
            <Link href={`/communities`}>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Explore communities...
              </Button>
            </Link>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

export default CommunitiesSidebar;
