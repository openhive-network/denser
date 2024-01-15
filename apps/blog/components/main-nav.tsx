import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@hive/ui/lib/utils';
import { useTranslation } from 'next-i18next';

export function MainNav() {
  const pathname = usePathname();
  const { t } = useTranslation('common_blog');

  return (
    <div className="flex h-full items-center justify-between lg:mr-4">
      <nav className="hidden h-full items-center space-x-2 text-sm font-medium lg:flex lg:text-base xl:space-x-6">
        <Link
          href="/trending"
          className={cn(
            'ml-6 flex h-full items-center border-b-2 border-white transition-colors hover:border-red-600 hover:text-red-600 dark:border-slate-950 hover:dark:border-red-600',
            pathname === '/trending' ? 'text-red-600' : 'text-foreground/60'
          )}
          data-testid="nav-posts-link"
        >
          {t('navigation.main_nav_bar.posts')}
        </Link>
        <Link
          href=":4000/proposals"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex h-full items-center border-b-2 border-white transition-colors hover:border-red-600 hover:text-red-600 dark:border-slate-950 hover:dark:border-red-600',
            pathname === '/proposals"' ? 'text-red-600' : 'text-foreground/60'
          )}
          data-testid="nav-proposals-link"
        >
          {t('navigation.main_nav_bar.proposals')}
        </Link>
        <Link
          href=":4000/~witnesses"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex h-full items-center border-b-2 border-white transition-colors hover:border-red-600 hover:text-red-600 dark:border-slate-950 hover:dark:border-red-600',
            pathname === '/~witnesses' ? 'text-red-600' : 'text-foreground/60'
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
            'flex h-full items-center border-b-2 border-white transition-colors hover:border-red-600 hover:text-red-600 dark:border-slate-950 hover:dark:border-red-600',
            pathname === 'https://hive.io/eco/' ? 'text-red-600' : 'text-foreground/60'
          )}
          data-testid="nav-our-dapps-link"
        >
          {t('navigation.main_nav_bar.out_dapps')}
        </Link>
      </nav>
    </div>
  );
}
