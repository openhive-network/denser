/* eslint-disable @next/next/no-img-element */

import { FC, useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@ui/components/button';
import { ModeToggle } from './mode-toggle';
import { MobileNav } from './mobile-nav';
import { MainNav } from './main-nav';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getLogger } from '@ui/lib/logging';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/components/avatar';
import { useLogout } from '@smart-signer/lib/auth/use-logout';

const logger = getLogger('app');

const SiteHeader: FC = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { user } = useUser({
    redirectTo: '',
    redirectIfFound: true
  });


  const onLogout = useLogout();

  return (
    <header className="supports-backdrop-blur:bg-background/60 sticky top-0 z-40 w-full border-b bg-background/95 shadow-sm backdrop-blur">
      <div className="container flex h-14 items-center">
        <MainNav />
        <MobileNav />
        <div className="flex flex-1 items-center justify-between space-x-2 sm:space-x-4 md:justify-end">
          <nav className="flex items-center space-x-1">
            <div className="mx-1 flex gap-1">

              {isClient && user?.isLoggedIn === false && (
                <Link href="https://signup.hive.io/">
                  <Button variant="redHover" size="sm" className="h-10 whitespace-nowrap">
                    Sign Up
                  </Button>
                </Link>
              )}

              {isClient && user?.isLoggedIn === false && (
                <Link href="/login">
                  <Button variant="redHover" size="sm" className="h-10">
                    Sign In
                  </Button>
                </Link>
              )}

              {isClient && user?.isLoggedIn === true && (
                <Link
                  href=""
                  onClick={async (e) => {
                    e.preventDefault();
                    await onLogout();
                  }}
                >
                  <Button variant="redHover" size="sm" className="h-10">
                    Logout
                  </Button>
                </Link>
              )}

              {isClient && user?.isLoggedIn === true && (
                <Link href="/profile">
                  <Button variant="redHover" size="sm" className="h-10 w-10 px-0">
                    <Avatar className="rounded-md" data-testid="profile-menu">
                      <AvatarImage src={`https://images.hive.blog/u/${user?.username || ''}/avatar/small`} />
                      <AvatarFallback>{user?.username.slice(0, 2).toUpperCase() || ''}</AvatarFallback>
                    </Avatar>
                  </Button>
                </Link>
              )}
            </div>
            <ModeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
