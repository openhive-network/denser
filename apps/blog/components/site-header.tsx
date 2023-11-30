import { Button } from '@hive/ui/components/button';
import { Icons } from '@hive/ui/components/icons';
import { Input } from '@hive/ui/components/input';
import { FC, useEffect } from 'react';
import Sidebar from './sidebar';
import { ModeToggle } from './mode-toggle';
import { LangToggle } from './lang-toggle';
import { MainNav } from './main-nav';
import { siteConfig } from '@hive/ui/config/site';
import Link from 'next/link';
import { useState, KeyboardEvent } from 'react';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import { useTranslation } from 'next-i18next';
import { useLocalStorage } from './hooks/use-local-storage';
import HiveAuthUtils from '../lib/hive-auth-utils';
import { fetchJson } from '../lib/fetch-json';
import LoginDialog from './login-dialog';
import { useUser } from './hooks/use-user';

const SiteHeader: FC = () => {
  const { user, mutateUser } = useUser({
    redirectTo: '',
    redirectIfFound: true
  });
  const [, setHiveAuthData] = useLocalStorage('hiveAuthData', HiveAuthUtils.initialHiveAuthData);

  const onLogout = async () => {
    setHiveAuthData(HiveAuthUtils.initialHiveAuthData);
    HiveAuthUtils.logout();
    await mutateUser(await fetchJson('/api/logout', { method: 'POST' }), false);
  };
  const router = useRouter();
  const { t } = useTranslation('common_blog');
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
            <div className="mx-1 hidden gap-1 sm:flex">
              <LoginDialog>
                {!user?.isLoggedIn ? (
                  <Button variant="ghost" className="text-base hover:text-red-500" data-testid="login-btn">
                    {t('navigation.main_nav_bar.login')}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="text-base hover:text-red-500"
                    data-testid="login-btn"
                    onClick={async (e) => {
                      e.preventDefault();
                      await onLogout();
                    }}
                  >
                    Logout
                  </Button>
                )}
              </LoginDialog>
              {!user?.isLoggedIn && (
                <Link href="https://signup.hive.io/">
                  <Button variant="redHover" data-testid="signup-btn">
                    {t('navigation.main_nav_bar.sign_up')}
                  </Button>
                </Link>
              )}
            </div>

            <div>
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
            </div>
            <Link href="/search">
              <Button variant="ghost" size="sm" className="h-10 w-10 px-0 lg:hidden">
                <Icons.search className="h-5 w-5 rotate-90" />
              </Button>
            </Link>
            <Link href="/submit.html">
              <Button variant="ghost" size="sm" className="h-10 w-10 px-0" data-testid="nav-pencil">
                <Icons.pencil className="h-5 w-5" />
              </Button>
            </Link>
            <ModeToggle />
            <LangToggle />
            {user?.isLoggedIn && (
              <Link href="/trending/my">
                <Button variant="redHover" size="sm" className="h-10 w-10 px-0">
                  {!user?.avatarUrl && (
                    <Icons.user className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
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
            <Sidebar />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
