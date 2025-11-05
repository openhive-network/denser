'use client';

import Link from 'next/link';
import { cn } from '@ui/lib/utils';
import { Card, CardContent, CardTitle } from '@hive/ui/components/card';
import { useTranslation } from '@/blog/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { getSubscriptions } from '@transaction/lib/bridge-api';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';

const CommunitiesMybar = () => {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const { data } = useQuery({
    queryKey: ['subscriptions', user.username],
    queryFn: () => getSubscriptions(user.username),
    enabled: user.isLoggedIn
  });
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
        <Link href={`/@${user.username}/feed`} className="text-base hover:text-destructive">
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
          <ul>
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
