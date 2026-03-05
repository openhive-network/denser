'use client';

import { Link } from '@hive/ui';
import { usePathname } from 'next/navigation';
import { cn } from '@ui/lib/utils';

import env from '@beam-australia/react-env';
import { useTranslation } from '@/blog/i18n/client';
import {
  getSidechainRewardsConfig,
  getSidechainRewardsFeedTag,
  isSidechainRewardsConfigured
} from '@ui/lib/sidechain-rewards';

export function MainNav() {
  const pathname = usePathname();
  const { t } = useTranslation('common_blog');
  const walletHost = env('WALLET_ENDPOINT');
  const sidechainConfig = getSidechainRewardsConfig();
  const isSidechainConfigured = isSidechainRewardsConfigured(sidechainConfig);
  const heCommunityTag = getSidechainRewardsFeedTag(sidechainConfig);
  const postsHref = isSidechainConfigured ? `/he-payout/${heCommunityTag}` : '/trending';
  const isPostsPath = pathname?.startsWith('/trending') || pathname?.startsWith('/he-payout');

  return (
    <div className="flex h-full items-center justify-between lg:mr-4">
      <nav className="hidden h-full items-center space-x-2 text-sm font-medium lg:flex lg:text-base xl:space-x-6">
        <Link
          href={postsHref}
          className={cn(
            'ml-6 flex h-full items-center border-b-2 border-background transition-colors hover:border-destructive hover:text-destructive',
            isPostsPath ? 'text-destructive' : 'text-primary'
          )}
          data-testid="nav-posts-link"
        >
          {t('navigation.main_nav_bar.posts')}
        </Link>
        <Link
          href={`${walletHost}/proposals`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex h-full items-center border-b-2 border-background transition-colors hover:border-destructive hover:text-destructive',
            pathname === '/proposals"' ? 'text-destructive' : 'text-primary'
          )}
          data-testid="nav-proposals-link"
        >
          {t('navigation.main_nav_bar.proposals')}
        </Link>
        <Link
          href={`${walletHost}/~witnesses`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex h-full items-center border-b-2 border-background transition-colors hover:border-destructive hover:text-destructive',
            pathname === '/~witnesses' ? 'text-destructive' : 'text-primary'
          )}
          data-testid="nav-witnesses-link"
        >
          {t('navigation.main_nav_bar.witnesses')}
        </Link>

        <Link
          href="https://hive.io/eco/"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex h-full items-center border-b-2 border-background transition-colors hover:border-destructive hover:text-destructive',
            pathname === 'https://hive.io/eco/' ? 'text-destructive' : 'text-primary'
          )}
          data-testid="nav-our-dapps-link"
        >
          {t('navigation.main_nav_bar.out_dapps')}
        </Link>
      </nav>
    </div>
  );
}
