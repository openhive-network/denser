import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@hive/ui/lib/utils';
import { useTranslation } from 'next-i18next';

export function MainNav() {
  const pathname = usePathname();
  const { t } = useTranslation('common_blog');

  return (
    <div className='lg:mr-4 h-full items-center flex justify-between'>
      <nav className='hidden lg:flex h-full items-center space-x-2 xl:space-x-6 text-sm lg:text-base font-medium'>
        <Link
          href='/trending'
          className={cn(
            'flex h-full items-center transition-colors dark:border-slate-950 border-b-2 border-white hover:border-red-600 hover:text-red-600 ml-6 hover:dark:border-red-600',
            pathname === '/trending' ? 'text-red-600' : 'text-foreground/60'
          )}
          data-testid='nav-posts-link'
        >
          {t('navigation.main_nav_bar.posts')}
        </Link>
        <Link
          href='http://localhost:4000/proposals'
          target='_blank'
          rel='noopener noreferrer'
          className={cn(
            'flex h-full items-center transition-colors dark:border-slate-950 border-b-2 border-white hover:border-red-600 hover:text-red-600 hover:dark:border-red-600',
            pathname === '/proposals"' ? 'text-red-600' : 'text-foreground/60'
          )}
          data-testid='nav-proposals-link'
        >
          {t('navigation.main_nav_bar.proposals')}
        </Link>
        <Link
          href='http://localhost:4000/~witnesses'
          target='_blank'
          rel='noopener noreferrer'
          className={cn(
            'flex h-full items-center transition-colors dark:border-slate-950 border-b-2 border-white hover:border-red-600 hover:text-red-600 hover:dark:border-red-600',
            pathname === '/~witnesses' ? 'text-red-600' : 'text-foreground/60'
          )}
          data-testid='nav-witnesses-link'
        >
          {t('navigation.main_nav_bar.witnesses')}
        </Link>

        <Link
          href='https://hive.io/eco/'
          target='_blank'
          rel='noopener noreferrer'
          className={cn(
            'flex h-full items-center transition-colors dark:border-slate-950 border-b-2 border-white hover:border-red-600 hover:text-red-600 hover:dark:border-red-600',
            pathname === 'https://hive.io/eco/' ? 'text-red-600' : 'text-foreground/60'
          )}
          data-testid='nav-our-dapps-link'
        >
          {t('navigation.main_nav_bar.out_dapps')}
        </Link>
      </nav>
    </div>
  );
}
