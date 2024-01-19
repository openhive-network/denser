import { Button } from '@hive/ui/components/button';
import { Icons } from '@hive/ui/components/icons';
import { Input } from '@hive/ui/components/input';
import Sidebar from './sidebar';
import { MainNav } from './main-nav';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@hive/ui/components/tooltip';
import { siteConfig } from '@hive/ui/config/site';
import Link from 'next/link';
import React, { useState, KeyboardEvent, FC, useEffect } from 'react';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import DialogHBAuth from '@smart-signer/components/dialog-hb-auth';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getLogger } from '@hive/ui/lib/logging';
import DialogLogin from './dialog-login';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/components';
import { useQuery } from '@tanstack/react-query';
import { getUnreadNotifications } from '../lib/bridge';
import ModeToggle from './mode-toggle';
import UserMenu from '@/blog/components/user-menu';
import LangToggle from './lang-toggle';
import { findRcAccounts } from '../lib/hive';
import { PieChart, Pie } from 'recharts';
import { RCAccount } from '@hiveio/dhive/lib/chain/rc';

const logger = getLogger('app');

const calculateRcStats = (userRc: RCAccount[]) => {
  const manaRegenerationTime = 432000;
  const currentTime = parseInt((new Date().getTime() / 1000).toFixed(0));
  const stats = {
    resourceCreditsPercent: 0,
    resourceCreditsWaitTime: 0
  };

  const maxRcMana = parseFloat(userRc[0].max_rc);
  const rcManaElapsed = currentTime - userRc[0].rc_manabar.last_update_time;
  let currentRcMana =
    parseFloat(userRc[0].rc_manabar.current_mana) + (rcManaElapsed * maxRcMana) / manaRegenerationTime;
  if (currentRcMana > maxRcMana) {
    currentRcMana = maxRcMana;
  }
  stats.resourceCreditsPercent = Math.round((currentRcMana * 100) / maxRcMana);
  stats.resourceCreditsWaitTime = ((100 - stats.resourceCreditsPercent) * manaRegenerationTime) / 100;

  return stats;
};

const SiteHeader: FC = () => {
  const router = useRouter();
  const { t } = useTranslation('common_blog');
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { user } = useUser();
  const { data, isLoading, isError } = useQuery(
    [['unreadNotifications', user?.username]],
    () => getUnreadNotifications(user?.username || ''),
    {
      enabled: !!user?.username
    }
  );
  const {
    data: rcData,
    isLoading: rcLoading,
    isError: rcError
  } = useQuery([['findRcAcconut', user?.username]], () => findRcAccounts(user?.username || ''), {
    enabled: !!user?.username
  });
  const stats = rcData
    ? calculateRcStats(rcData)
    : {
        resourceCreditsPercent: 0,
        resourceCreditsWaitTime: 0
      };
  const chartAngle = (360 * stats.resourceCreditsPercent) / 100;
  const chart = [{ name: '', value: 1 }];

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
      translate="no"
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
                  <Button
                    variant="ghost"
                    className="whitespace-nowrap text-base hover:text-red-500"
                    data-testid="login-btn"
                  >
                    {t('navigation.main_nav_bar.login')}
                  </Button>
                </DialogLogin>
                <Link href="https://signup.hive.io/">
                  <Button variant="redHover" className="whitespace-nowrap" data-testid="signup-btn">
                    {t('navigation.main_nav_bar.sign_up')}
                  </Button>
                </Link>
              </div>
            )}
            {isClient && !user?.isLoggedIn && (
              <DialogHBAuth
                onAuthComplete={(username, keyType) => {
                  logger.info('onAuthComplete %o', { username, keyType });
                }}
              >
                <Link href="#" data-testid="navbar-hbauth-link">
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
            <Link href="/search" data-testid="navbar-search-link">
              <Button variant="ghost" size="sm" className="h-10 w-10 px-0 ">
                <Icons.search className="h-5 w-5 rotate-90" />
              </Button>
            </Link>
            <Link href="/submit.html">
              <Button variant="ghost" size="sm" className="h-10 w-10 px-0" data-testid="nav-pencil">
                <Icons.pencil className="h-5 w-5" />
              </Button>
            </Link>
            {isClient && !user?.isLoggedIn ? (
              <ModeToggle>
                <Button variant="ghost" size="sm" className="h-10 w-full px-0" data-testid="theme-mode">
                  <Icons.sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Icons.moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="hidden">Toggle theme</span>
                </Button>
              </ModeToggle>
            ) : null}
            {isClient && !user?.isLoggedIn ? <LangToggle logged={user ? user?.isLoggedIn : false} /> : null}
            {isClient && user?.isLoggedIn ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger data-testid="comment-card-footer-downvote">
                    <UserMenu user={user}>
                      <div className="relative inline-flex w-fit cursor-pointer items-center justify-center">
                        {data && data.unread !== 0 ? (
                          <div className="absolute bottom-auto left-auto right-0 top-0 z-10 inline-block -translate-y-1/2 translate-x-2/4 rotate-0 skew-x-0 skew-y-0 scale-x-100 scale-y-100 whitespace-nowrap rounded-full bg-red-600 px-2.5 py-1 text-center align-baseline text-xs font-bold leading-none text-white">
                            {data.unread}
                          </div>
                        ) : null}
                        <div className="absolute cursor-pointer">
                          <PieChart width={50} height={50}>
                            <Pie
                              data={chart}
                              cx={20}
                              cy={20}
                              startAngle={90}
                              endAngle={-chartAngle + 90}
                              innerRadius={17}
                              outerRadius={23}
                              fill="#0088FE"
                              paddingAngle={0}
                              dataKey="value"
                            ></Pie>
                          </PieChart>
                        </div>
                        <Avatar>
                          <AvatarImage
                            src={`https://images.hive.blog/u/${user?.username}/avatar/small`}
                            alt="Profile picture"
                          />
                          <AvatarFallback>
                            <Icons.user />
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </UserMenu>
                  </TooltipTrigger>
                  <TooltipContent className="flex flex-col">
                    <span>Resource Credits</span>
                    <span>(RC) level: {stats.resourceCreditsPercent}%</span>
                    {stats.resourceCreditsWaitTime !== 0 ? (
                      <span>Full in {stats.resourceCreditsWaitTime / 3600}h</span>
                    ) : null}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            <Sidebar />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
