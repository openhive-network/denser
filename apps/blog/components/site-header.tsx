import { Button } from '@hive/ui/components/button';
import { Icons } from '@hive/ui/components/icons';
import { Input } from '@hive/ui/components/input';
import Sidebar from './sidebar';
import { MainNav } from './main-nav';
import { siteConfig } from '@hive/ui/config/site';
import Link from 'next/link';
import { useState, KeyboardEvent, FC, useEffect } from 'react';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import DialogHBAuth from '@smart-signer/components/dialog-hb-auth';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import dynamic from 'next/dynamic';
import { getLogger } from '@hive/ui/lib/logging';
import DialogLogin from './dialog-login';
const UserMenu = dynamic(() => import('@/blog/components/user-menu'), { ssr: false });
const LangToggle = dynamic(() => import('@/blog/components/lang-toggle'), { ssr: false });
const ModeToggle = dynamic(() => import('@/blog/components/mode-toggle'), { ssr: false });

const logger = getLogger('app');

const SiteHeader: FC = () => {
  const router = useRouter();
  const { t } = useTranslation('common_blog');
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { user } = useUser();

  const [input, setInput] = useState('');
  const handleEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      router.push(`/search?q=${input}&s=newest`);
    }
  };

  const [isNavHidden, setIsNavHidden] = useState(false);
  let lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
  useEffect(() => {
    const handleScroll = () => {
      if (lastScrollY < window.scrollY) {
        setIsNavHidden(true);
      } else {
        setIsNavHidden(false);
      }
      lastScrollY = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  return (
    <header
      className={clsx(
        'supports-backdrop-blur:bg-background/60 sticky top-0 z-40 w-full border-b bg-background/95 shadow-sm backdrop-blur transition ease-in-out',
        { 'translate-y-[-56px]': isNavHidden }
      )}
    >
      <div className="container flex h-14 w-full items-center justify-between">
        <Link href="/trending" className="flex items-center space-x-2">
          <Icons.hive className="h-6 w-6" />
          <span className="font-bold sm:inline-block">{siteConfig.name}</span>
        </Link>

        <MainNav />
        <div className="flex items-center space-x-2 sm:space-x-4">
          <nav className="flex items-center space-x-1">
            {isClient && user?.isLoggedIn ? null : (
              <div className="mx-1 hidden gap-1 sm:flex">
                <DialogLogin>
                  <Button variant="ghost" className="text-base hover:text-red-500" data-testid="login-btn">
                    {t('navigation.main_nav_bar.login')}
                  </Button>
                </DialogLogin>
                <Link href="https://signup.hive.io/">
                  <Button variant="redHover" data-testid="signup-btn" className=" whitespace-nowrap">
                    {t('navigation.main_nav_bar.sign_up')}
                  </Button>
                </Link>
              </div>
            )}
            {isClient && (
              <DialogHBAuth
                onAuthComplete={(username, keyType) => {
                  logger.info('onAuthComplete %o', { username, keyType });
                }}
              >
                <Link href="#">
                  <Button variant="redHover" className="hidden gap-1 sm:flex">
                    Hbauth
                  </Button>
                </Link>
              </DialogHBAuth>
            )}
            {/* <div>
              <div className="relative hidden lg:block">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Icons.search className="h-5 w-5 rotate-90" />
                </div>
                <Input
                  type="search"
                  className="block w-[200px] rounded-full p-4 pl-10 text-sm"
                  placeholder={t('navigation.main_nav_bar.search')}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => handleEnter(e)}
                />
              </div>
            </div> */}
            <Link href="/search">
              <Button variant="ghost" size="sm" className="h-10 w-10 px-0 ">
                <Icons.search className="h-5 w-5 rotate-90" />
              </Button>
            </Link>
            <Link href="/submit.html">
              <Button variant="ghost" size="sm" className="h-10 w-10 px-0" data-testid="nav-pencil">
                <Icons.pencil className="h-5 w-5" />
              </Button>
            </Link>
            {user && !user?.isLoggedIn ? (
              <ModeToggle>
                <Button variant="ghost" size="sm" className="h-10 w-full px-0" data-testid="theme-mode">
                  <Icons.sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Icons.moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="hidden">Toggle theme</span>
                </Button>
              </ModeToggle>
            ) : null}
            {user && !user?.isLoggedIn ? <LangToggle logged={user ? user?.isLoggedIn : false} /> : null}
            {user && user?.isLoggedIn ? (
              <UserMenu user={user}>
                {/* {!user?.avatarUrl && ( */}
                <img
                  className="h-10 w-10 cursor-pointer rounded-md px-0"
                  src={`https://images.hive.blog/u/${user?.username || ''}/avatar/small`}
                  alt="Profile picture"
                />
                {/* )} */}
              </UserMenu>
            ) : null}
            <Sidebar />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
