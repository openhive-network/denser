import Link from 'next/link';
import { cn } from '@ui/lib/utils';
import { Card, CardContent, CardTitle } from '@hive/ui/components/card';
import { useTranslation } from 'next-i18next';

const CommunitiesMybar = ({
  data,
  username
}: {
  data: string[][] | null | undefined;
  username: string;
}) => {
  const { t } = useTranslation('common_blog');

  return (
    <Card
      className={cn('my-4 hidden h-fit w-full flex-col bg-background px-8 py-2 text-primary md:flex')}
      data-testid="card-trending-comunities"
    >
      <CardTitle>
        <Link href="/trending" className="text-base hover:text-destructive">
          {t('navigation.communities_nav.all_posts')}
        </Link>
      </CardTitle>
      <CardTitle>
        <Link href={`/@${username}/feed`} className="text-base hover:text-destructive">
          My friends
        </Link>
      </CardTitle>
      <CardTitle>
        <Link href="../trending/my" className="text-base hover:text-destructive">
          My communities
        </Link>
      </CardTitle>

      {data && data?.length > 0 ? (
        <CardContent className="px-0 py-2">
          <span className="text-sm opacity-60">My subscriptions</span>
          <ul data-testid="my-subscriptions-community-list">
            {data.map((e) => (
              <li key={e[0]}>
                <Link href={`/trending/${e[0]}`} className="w-full text-sm font-light hover:text-destructive">
                  {e[1]}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
      <CardTitle>
        <Link href="/communities" className="text-base hover:text-destructive">
          {t('navigation.communities_nav.explore_communities')}
        </Link>
      </CardTitle>
    </Card>
  );
};

export default CommunitiesMybar;
