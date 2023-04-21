import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="mr-4 hidden md:flex">
      <Link href="/trending" className="mr-6 flex items-center space-x-2">
        <Icons.hive className="h-6 w-6" />
        <span className="hidden font-bold sm:inline-block">{siteConfig.name}</span>
      </Link>
      <nav className="flex items-center space-x-6 text-sm font-medium">
        <Link
          href="/trending"
          className={cn(
            'transition-colors hover:text-foreground/80',
            pathname === '/trending' ? 'text-foreground' : 'text-foreground/60'
          )}
        >
          Posts
        </Link>
        <Link
          href="https://wallet.hive.blog/proposals"
          className={cn(
            'transition-colors hover:text-foreground/80',
            pathname === 'https://wallet.hive.blog/proposals' ? 'text-foreground' : 'text-foreground/60'
          )}
        >
          Proposals
        </Link>
        <Link
          href="https://wallet.hive.blog/~witnesses"
          className={cn(
            'transition-colors hover:text-foreground/80',
            pathname === 'https://wallet.hive.blog/~witnesses' ? 'text-foreground' : 'text-foreground/60'
          )}
        >
          Witnesses
        </Link>
        <Link
          href="https://hive.io/eco/"
          className={cn(
            'transition-colors hover:text-foreground/80',
            pathname === 'https://hive.io/eco/' ? 'text-foreground' : 'text-foreground/60'
          )}
        >
          Our dApps
        </Link>
      </nav>
    </div>
  );
}
