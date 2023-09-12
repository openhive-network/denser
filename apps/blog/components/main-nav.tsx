import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@hive/ui/lib/utils';

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="lg:mr-4 h-full items-center flex justify-between">
      <nav className="hidden lg:flex h-full items-center space-x-6 text-sm lg:text-base font-medium">
        <Link
          href="/trending"
          className={cn(
            'flex h-full items-center transition-colors hover:border-b-2 hover:border-red-600 hover:text-red-600 ml-6',
            pathname === '/trending' ? 'text-red-600' : 'text-foreground/60'
          )}
          data-testid="nav-posts-link"
        >
          Posts
        </Link>
        <Link
          href="http://localhost:4000/proposals"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex h-full items-center transition-colors hover:border-b-2 hover:border-red-600 hover:text-red-600',
            pathname === '/proposals"' ? 'text-red-600' : 'text-foreground/60'
          )}
          data-testid="nav-proposals-link"
        >
          Proposals
        </Link>
        <Link
          href="http://localhost:4000/~witnesses"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex h-full items-center transition-colors hover:border-b-2 hover:border-red-600 hover:text-red-600',
            pathname === '/~witnesses' ? 'text-red-600' : 'text-foreground/60'
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
