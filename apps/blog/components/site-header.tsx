import { Button } from '@hive/ui/components/button';
import { Icons } from '@/blog/components/icons';
import { MainNav } from '@/blog/components/main-nav';
import { MobileNav } from '@/blog/components/mobile-nav';
import { ModeToggle } from '@/blog/components/mode-toggle';
import ProfileDropdownMenu from '@/blog/components/profile-dropdown-menu';
import { Input } from '@hive/ui/components/input';
import { FC } from 'react';
import Sidebar from '@/blog/components/sidebar';

const SiteHeader: FC = () => {
  return (
    <header className="supports-backdrop-blur:bg-background/60 sticky top-0 z-40 w-full border-b bg-background/95 shadow-sm backdrop-blur">
      <div className="container flex h-14 items-center">
        <MainNav />
        <MobileNav />
        <div className="flex flex-1 items-center justify-between space-x-2 sm:space-x-4 md:justify-end">
          <nav className="flex items-center space-x-1">
            <Input type="search" placeholder="Search..." className={`md:w-[100px] lg:w-[300px]`} />
            <Button variant="ghost" size="sm" className="h-10 w-10 px-0" data-testid="nav-pencil">
              <Icons.pencil className="h-5 w-5" />
            </Button>
            <ModeToggle />
            <Sidebar />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
