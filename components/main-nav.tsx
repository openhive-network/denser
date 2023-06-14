import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="mr-4 hidden h-full items-center md:flex">
      <Link href="/trending" className="mr-6 flex items-center space-x-2">
        <Icons.hive className="h-6 w-6" />
        <span className="hidden font-bold sm:inline-block">{siteConfig.name}</span>
      </Link>
      <nav className="flex h-full items-center items-center space-x-6 text-sm font-medium">
        <Link
          href="/trending"
          className={cn(
            'flex h-full items-center transition-colors hover:border-b-2 hover:border-red-600 hover:text-red-600',
            pathname === '/trending' ? 'text-red-600' : 'text-foreground/60'
          )}
          data-testid="nav-posts-link"
        >
          Posts
        </Link>
        <Link
          href="https://wallet.hive.blog/proposals"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex h-full items-center transition-colors hover:border-b-2 hover:border-red-600 hover:text-red-600',
            pathname === 'https://wallet.hive.blog/proposals"' ? 'text-red-600' : 'text-foreground/60'
          )}
          data-testid="nav-proposals-link"
        >
          Proposals
        </Link>
        <Link
          href="https://wallet.hive.blog/~witnesses"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex h-full items-center transition-colors hover:border-b-2 hover:border-red-600 hover:text-red-600',
            pathname === 'https://wallet.hive.blog/~witnesses' ? 'text-red-600' : 'text-foreground/60'
          )}
          data-testid="nav-witnesses-link"
        >
          Witnesses
        </Link>

        <Link
          href="https://hive.io/eco/"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex h-full items-center transition-colors hover:border-b-2 hover:border-red-600 hover:text-red-600',
            pathname === 'https://hive.io/eco/' ? 'text-red-600' : 'text-foreground/60'
          )}
          data-testid="nav-our-dapps-link"
        >
          Our dApps
        </Link>
      </nav>
    </div>
  );
}
