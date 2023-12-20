import { Button } from '@hive/ui/components/button';
import { Icons } from '@hive/ui/components/icons';
import { Input } from '@hive/ui/components/input';
import React, { FC, useEffect } from 'react';
import Sidebar from './sidebar';
import { ModeToggle } from './mode-toggle';
import { LangToggle } from './lang-toggle';
import { MainNav } from './main-nav';
import { siteConfig } from '@hive/ui/config/site';
import Link from 'next/link';
import DialogLogin from './dialog-login';
import { useState, KeyboardEvent } from 'react';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import DialogHBAuth from '@/blog/components/dialog-hb-auth';
import { useAppStore } from '../store/app';
import { authService } from '../lib/authService';
import { toast } from '@ui/components/hooks/use-toast';
import { getAccountFull } from '@ui/lib/hive';
import { KeyAuthorityType } from '@hive/hb-auth';

const SiteHeader: FC = () => {
  const router = useRouter();
  const { t } = useTranslation('common_blog');
  const [input, setInput] = useState('');
  const [username, setUsername] = useState<string>('');
  const {currentProfile,setCurrentProfile, setCurrentProfileKeyType} = useAppStore((state) => state);
  const handleEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      router.push(`/search?q=${input}&s=newest`);
    }
  };

  const [isNavHidden, setIsNavHidden] = useState(false);
  let lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;

  const {
    isLoading: currentProfileDataIsLoading,
    error: currenProfileDataError,
    data: currentProfileData,
    remove
  } = useQuery(['currentProfile'], () => getAccountFull(username), {
    onSuccess: (data) => {
      setCurrentProfile(data);
    },
    enabled: !!username
  });

  // check authorization if user already authorized
  useEffect(() => {
    authService.getOnlineClient().then((client) => {
      client.getAuths().then((auths) => {
        const user = auths.find((user) => user.authorized);
        if (user) {
          setUsername(user?.username)
          setCurrentProfileKeyType(user?.keyType!)
        }
      })
    })
  }, [])

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

  async function handleLogout() {
    const authClient = await authService.getOnlineClient();
    await authClient.logout();
    setCurrentProfile(null);
    setUsername('');
    remove();

    toast({
      description: `You are logout!`,
      variant: 'success'
    });
  }

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
              {currentProfile ? (
                <Button variant="ghost" className="text-base hover:text-red-500" onClick={handleLogout}>
                  Logout HBAuth
                </Button>
              ) : (
                <DialogHBAuth onAuthComplete={(username, keyType) => {
                  setUsername(username);
                  setCurrentProfileKeyType(keyType)
                }}>
                  <Button variant="ghost" className="text-base hover:text-red-500">
                    Login HBAuth
                  </Button>
                </DialogHBAuth>
              )}
              {/*<DialogLogin>*/}
              {/*  <Button variant="ghost" className="text-base hover:text-red-500" data-testid="login-btn">*/}
              {/*    {t('navigation.main_nav_bar.login')}*/}
              {/*  </Button>*/}
              {/*</DialogLogin>*/}
              <Link href="https://signup.hive.io/">
                <Button variant="redHover" data-testid="signup-btn">
                  {t('navigation.main_nav_bar.sign_up')}
                </Button>
              </Link>
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
            <Sidebar />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
