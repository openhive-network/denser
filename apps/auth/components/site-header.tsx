/* eslint-disable @next/next/no-img-element */

import { Button } from "@hive/ui/components/button";
import { FC } from "react";
import Link from "next/link";
import { useRouter } from 'next/router'
import { ModeToggle } from "./mode-toggle";
import { MobileNav } from "./mobile-nav";
import { MainNav } from "./main-nav";
import { Icons } from "@hive/ui/components/icons";
import { useUser } from '@/auth/lib/use-user';
import { fetchJson } from '@/auth/lib/fetch-json';

const SiteHeader: FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const { mutateUser } = useUser({
    redirectTo: '',
    redirectIfFound: true,
  })
  const onLogout = async () => {
    mutateUser(
      await fetchJson('/api/logout', { method: 'POST' }),
      false
    )
    router.push('/')
  }

  return (
    <header className="supports-backdrop-blur:bg-background/60 sticky top-0 z-40 w-full border-b bg-background/95 shadow-sm backdrop-blur">
      <div className="container flex h-14 items-center">
        <MainNav />
        <MobileNav />
        <div className="flex flex-1 items-center justify-between space-x-2 sm:space-x-4 md:justify-end">
          <nav className="flex items-center space-x-1">
            <div className="hidden sm:flex gap-1 mx-1">

              {user?.isLoggedIn === false && (
                <Link href="https://signup.hive.io/">
                  <Button
                    variant="redHover"
                    size="sm"
                    className="h-10"
                  >
                    Sign Up
                  </Button>
                </Link>
              )}

              {user?.isLoggedIn === false && (
                <Link href="/login">
                  <Button
                    variant="redHover"
                    size="sm"
                    className="h-10"
                  >
                    Login
                  </Button>
                </Link>
              )}

              {user?.isLoggedIn === true && (
                  <Link
                    href=""
                    onClick={async (e) => {
                      e.preventDefault()
                      await onLogout();
                    }}
                  >
                  <Button
                    variant="redHover"
                    size="sm"
                    className="h-10"
                  >
                    Logout
                  </Button>
                </Link>
              )}

              {user?.isLoggedIn === true && (
                <Link href="/profile">
                  <Button
                    variant="redHover"
                    size="sm"
                    className="h-10 w-10 px-0"
                  >
                    {!user?.avatarUrl && (
                      <Icons.user
                        className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                      />
                    )}
                    {user?.avatarUrl && (
                      <img
                        className="rounded-md"
                        // src={user?.avatarUrl}
                        src={`https://images.hive.blog/u/${user?.username || ''}/avatar/small`}
                        alt="Profile picture"
                      />
                    )}
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
