/* eslint-disable @next/next/no-img-element */
"use client";

import { Button } from "@hive/ui/components/button";
import { FC, useState, useEffect } from "react";
import Image from 'next/image'
import Link from "next/link";
import { useRouter } from 'next/router'
import { ModeToggle } from "./mode-toggle";
import { MobileNav } from "./mobile-nav";
import { MainNav } from "./main-nav";
// import DialogLogin from "./dialog-login";

import { useUser as useUserSwr } from '@/auth/lib/use-user';
import fetchJson from '@/auth/lib/fetch-json';

import { useSignOut } from "@/auth/lib/auth/useSignOut";
import { useUser } from "@/auth/lib/auth/useUser";

const SiteHeader: FC = () => {
  const router = useRouter();

  // When using SWR.
  // const { user } = useUserSwr();
  // const { mutateUser } = useUserSwr({
  //   redirectTo: '',
  //   redirectIfFound: true,
  // })
  // const onLogout = async () => {
  //   mutateUser(
  //     await fetchJson('/api/logout', { method: 'POST' }),
  //     false
  //   )
  //   router.push('/')
  // }

  // When using react-query.
  const { user } = useUser({
    redirectTo: '',
    redirectIfFound: true,
  });
  console.log('bamboo user', user);
  const onSignOut = useSignOut();
  const onLogout = async () => onSignOut()

  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <header className="supports-backdrop-blur:bg-background/60 sticky top-0 z-40 w-full border-b bg-background/95 shadow-sm backdrop-blur">
      <div className="container flex h-14 items-center">
        <MainNav />
        <MobileNav />
        <div className="flex flex-1 items-center justify-between space-x-2 sm:space-x-4 md:justify-end">
          <nav className="flex items-center space-x-1">
            {isClient && <div className="hidden sm:flex gap-1 mx-1">
              {user?.isLoggedIn === false && (
                <Link href="/login">
                  <Button variant="redHover">Login SWR</Button>
                </Link>
              )}
              {user?.isLoggedIn === false && (
                <Link href="/signin">
                  <Button variant="redHover">Login QUERY</Button>
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

                      {/* <Image
                        src={user.avatarUrl}
                        width={32}
                        height={32}
                        alt=""
                      /> */}

                    </span>
                </a>
              </Link>
              )}
            </div>}
            <ModeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
