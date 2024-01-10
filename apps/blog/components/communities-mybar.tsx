import Link from 'next/link';
import { cn } from '@/blog/lib/utils';
import { Card, CardContent, CardTitle } from '@hive/ui/components/card';
import { useTranslation } from 'next-i18next';
import { Subscription } from '../lib/bridge';

const CommunitiesMybar = ({
  data,
  username
}: {
  data: Subscription[] | null | undefined;
  username: string;
}) => {
  const { t } = useTranslation('common_blog');

  return (
    <Card
      className={cn(
        'my-4 hidden h-fit w-full flex-col px-8 py-2 dark:bg-background/95 dark:text-white md:flex'
      )}
      data-testid="card-trending-comunities"
    >
      <CardTitle>
        <Link href="/trending" className="text-base hover:cursor-pointer hover:text-red-600">
          {t('navigation.communities_nav.all_posts')}
        </Link>
      </CardTitle>
      <CardTitle>
        <Link href={`/@${username}/feed`} className="text-base hover:cursor-pointer hover:text-red-600">
          My friends
        </Link>
      </CardTitle>
      <CardTitle>
        <Link href="/trending/my" className="text-base hover:cursor-pointer hover:text-red-600">
          My communities
        </Link>
      </CardTitle>

      {data && data?.length > 0 ? (
        <CardContent className="px-0 py-2">
          <span className="text-sm opacity-60">My subscriptions</span>
          <ul>
            {data.map((e) => (
              <li key={e[0]}>
                <Link
                  href={`/trending/${e[0]}`}
                  className="w-full text-sm font-light hover:cursor-pointer hover:text-red-600"
                >
                  {e[1]}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
      <CardTitle>
        <Link href="/communities" className="text-base hover:cursor-pointer hover:text-red-600">
          {t('navigation.communities_nav.explore_communities')}
        </Link>
      </CardTitle>
    </Card>
  );
};

export default CommunitiesMybar;
