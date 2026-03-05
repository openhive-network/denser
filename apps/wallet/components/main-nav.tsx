import { Link } from '@hive/ui';
import { usePathname } from 'next/navigation';
import { cn } from '@ui/lib/utils';

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="mr-4 hidden h-full items-center md:flex">
      <nav className="hidden h-full items-center space-x-6 text-sm font-medium lg:flex lg:text-base">
        <Link
          href="/trending"
          target="_blank"
          className={cn(
            'flex h-full items-center border-b-2 border-white transition-colors hover:border-destructive hover:text-destructive',
            pathname === '/trending' ? 'text-destructive' : 'text-foreground/60'
          )}
          data-testid="nav-posts-link"
        >
          Posts
        </Link>
        <Link
          href="/proposals"
          rel="noopener noreferrer"
          className={cn(
            'flex h-full items-center border-b-2 border-white transition-colors hover:border-destructive hover:text-destructive',
            pathname === '/proposals' ? 'text-destructive' : 'text-foreground/60'
          )}
          data-testid="nav-proposals-link"
        >
          Proposals
        </Link>
        <Link
          href="/~witnesses"
          rel="noopener noreferrer"
          className={cn(
            'flex h-full items-center border-b-2 border-white transition-colors hover:border-destructive hover:text-destructive',
            pathname === '/~witnesses' ? 'text-destructive' : 'text-foreground/60'
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
            'flex h-full items-center border-b-2 border-white transition-colors hover:border-destructive hover:text-destructive',
            pathname === 'https://hive.io/eco/' ? 'text-destructive' : 'text-foreground/60'
          )}
          data-testid="nav-our-dapps-link"
        >
          Our dApps
        </Link>
      </nav>
    </div>
  );
}
