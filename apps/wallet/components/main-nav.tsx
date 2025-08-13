import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@ui/lib/utils';

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="mr-4 hidden h-full items-center md:flex">
      <nav className="hidden h-full items-center space-x-6 text-sm font-medium lg:flex lg:text-base">
        <Link
          prefetch={false}
          href="/trending"
          target="_blank"
          className={cn(
            'flex h-full items-center border-b-2 border-white transition-colors hover:border-red-600 hover:text-red-600',
            pathname === '/trending' ? 'text-red-600' : 'text-foreground/60'
          )}
          data-testid="nav-posts-link"
        >
          Posts
        </Link>
        <Link
          prefetch={false}
          href="/proposals"
          rel="noopener noreferrer"
          className={cn(
            'flex h-full items-center border-b-2 border-white transition-colors hover:border-red-600 hover:text-red-600',
            pathname === '/proposals' ? 'text-red-600' : 'text-foreground/60'
          )}
          data-testid="nav-proposals-link"
        >
          Proposals
        </Link>
        <Link
          prefetch={false}
          href="/~witnesses"
          rel="noopener noreferrer"
          className={cn(
            'flex h-full items-center border-b-2 border-white transition-colors hover:border-red-600 hover:text-red-600',
            pathname === '/~witnesses' ? 'text-red-600' : 'text-foreground/60'
          )}
          data-testid="nav-witnesses-link"
        >
          Witnesses
        </Link>

        <Link
          prefetch={false}
          href="https://hive.io/eco/"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex h-full items-center border-b-2 border-white transition-colors hover:border-red-600 hover:text-red-600',
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
