import { Button } from "@hive/ui/components/button";
import { FC } from "react";
import Image from 'next/image'
import Link from "next/link";
import { useRouter } from 'next/router'
import { ModeToggle } from "./mode-toggle";
import { MobileNav } from "./mobile-nav";
import { MainNav } from "./main-nav";
import DialogLogin from "./dialog-login";
import useUser from '@/auth/lib/use-user';
import fetchJson from '@/auth/lib/fetch-json';

const SiteHeader: FC = () => {
  const { user } = useUser();
  const { mutateUser } = useUser({
    redirectTo: '',
    redirectIfFound: true,
  })
  const router = useRouter();

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
                      mutateUser(
                        await fetchJson('/api/logout', { method: 'POST' }),
                        false
                      )
                      router.push('/')
                    }}
                  >
                  <Button variant="redHover">Logout</Button>
                </Link>
              )}
              {user?.isLoggedIn === true && (
                <Link href="/profile-sg" legacyBehavior>
                  <a>
                    <span
                      style={{
                        marginRight: '.3em',
                        verticalAlign: 'middle',
                        borderRadius: '100%',
                        overflow: 'hidden',
                      }}
                    >
                      <Image
                        src={user.avatarUrl}
                        width={32}
                        height={32}
                        alt=""
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
