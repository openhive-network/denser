/* eslint-disable @next/next/no-img-element */

import { Button } from "@hive/ui/components/button";
import { FC, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from 'next/router'
import { ModeToggle } from "./mode-toggle";
import { MobileNav } from "./mobile-nav";
import { MainNav } from "./main-nav";
// import DialogLogin from "./dialog-login";

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
                <Link href="/login">
                  <Button variant="redHover">Login</Button>
                </Link>
              )}
              {user?.isLoggedIn === false && (
                <Link href="https://signup.hive.io/">
                  <Button variant="redHover">Sign up</Button>
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
                  <Button variant="redHover">Logout</Button>
                </Link>
              )}
              {user?.isLoggedIn === true && (
                <Link href="/profile" legacyBehavior>
                  <a>
                    <span
                      style={{
                        marginRight: '.3em',
                        verticalAlign: 'middle',
                        borderRadius: '100%',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        className="h-10 w-10 rounded-md"
                        src={user?.avatarUrl}
                        alt="Profile picture"
                      />
                    </span>
                </a>
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
