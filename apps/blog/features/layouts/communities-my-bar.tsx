'use client';

import { Link } from '@hive/ui';
import { cn } from '@ui/lib/utils';
import { useTranslation } from '@/blog/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';

const CommunitiesMyBar = ({ data }: { data: string[][] }) => {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();

  return (
    <nav
      aria-labelledby="communities-my-bar-heading"
      className={cn('my-4 hidden h-fit w-full flex-col rounded-md border bg-card px-8 py-2 text-primary shadow-sm md:flex')}
      data-testid="card-trending-comunities"
    >
      <h2 id="communities-my-bar-heading" className="sr-only">{t('navigation.communities_nav.communities')}</h2>
      <ul className="space-y-1">
        <li>
          <Link href="/trending" className="block py-1.5 text-base font-semibold hover:text-destructive">
            {t('navigation.communities_nav.all_posts')}
          </Link>
        </li>
        <li>
          <Link href={`/@${user.username}/feed`} className="block py-1.5 text-base font-semibold hover:text-destructive">
            {t('navigation.communities_nav.my_friends')}
          </Link>
        </li>
        <li>
          <Link href="../trending/my" className="block py-1.5 text-base font-semibold hover:text-destructive">
            {t('navigation.communities_nav.my_communities')}
          </Link>
        </li>
      </ul>

      {data && data?.length > 0 ? (
        <div className="px-0 py-2">
          <span className="text-sm text-muted-foreground">{t('navigation.communities_nav.my_subscriptions')}</span>
          <ul>
            {data.map((e) => (
              <li key={e[0]}>
                <Link href={`/trending/${e[0]}`} className="w-full text-sm font-light hover:text-destructive">
                  {e[1]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <ul>
        <li>
          <Link href="/communities" className="block py-1.5 text-base font-semibold hover:text-destructive">
            {t('navigation.communities_nav.explore_communities')}
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default CommunitiesMyBar;
