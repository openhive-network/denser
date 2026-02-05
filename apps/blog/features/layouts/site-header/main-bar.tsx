'use client';

import { Button } from '@ui/components/button';
import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { siteConfig } from '@ui/config/site';
import { Link } from '@hive/ui';
import React, { useState, FC, useEffect } from 'react';
import clsx from 'clsx';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { Avatar, AvatarFallback, AvatarImage, Skeleton } from '@ui/components';
import { useQuery } from '@tanstack/react-query';
import { getUnreadNotifications } from '@transaction/lib/bridge-api';
import UserMenu from '@/blog/features/layouts/site-header/user-menu';
import { ManabarRing } from './manabar-ring';
import TooltipContainer from '@ui/components/tooltip-container';
import { ModeSwitchInput } from '@ui/components/mode-switch-input';
import { getUserAvatarUrl } from '@hive/ui';
import { getHiveSenseStatus } from '@transaction/lib/hivesense-api';
import { useLoggedUserContext } from '@/blog/features/votes/hooks/use-logged-user';
import DialogLogin from '@/blog/components/dialog-login';
import ModeToggle from '@/blog/features/layouts/mode-toggle';
import LangToggle from '@/blog/features/layouts/lang-toggle';
import { hoursAndMinutes } from '@/blog/lib/utils';
import Sidebar from '@/blog/features/layouts/sidebar';
import { useTranslation } from '@/blog/i18n/client';
import { usePathname } from 'next/navigation';
import { MainNav } from './main-nav';
import SearchButton from './search-button';

const MainBar: FC = () => {
  const { t } = useTranslation('common_blog');
  const pathname = usePathname();
  const { user } = useUserClient();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { manabarsData } = useLoggedUserContext();
  const { data } = useQuery({
    queryKey: ['unreadNotifications', user.username],
    queryFn: () => getUnreadNotifications(user.username),
    enabled: !!user.username
  });
  const { data: hiveSense } = useQuery({
    queryKey: ['hivesense-api'],
    queryFn: () => getHiveSenseStatus(),
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
  const upvotePercent = manabarsData?.upvote.percentageValue ?? 0;
  const downvotePercent = manabarsData?.downvote.percentageValue ?? 0;
  const rcPercent = manabarsData?.rc.percentageValue ?? 0;

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
        'sticky top-0 z-40 w-full bg-background shadow-sm transition duration-500 ease-in-out',
        {
          'translate-y-[-56px]': isNavHidden
        }
      )}
      translate="no"
    >
      <div className="container flex h-16 w-full items-center justify-between">
        <Link href="/trending" className="flex items-center space-x-2">
          <Icons.hive className="h-6 w-6" />
          <div className="flex flex-col md:flex-row">
            <span className="font-bold sm:inline-block">{siteConfig.name}</span>
            {siteConfig.chainEnv !== 'mainnet' && (
              <span className="text-xs uppercase text-destructive">{siteConfig.chainEnv}</span>
            )}
          </div>
        </Link>

        <MainNav />
        <div className="flex items-center space-x-2 sm:space-x-4">
          <nav className="flex items-center space-x-1">
            {!isClient ? (
              <Skeleton className="mx-1 hidden h-9 w-32 sm:block" />
            ) : !user?.isLoggedIn ? (
              <div className="mx-1 hidden gap-1 sm:flex">
                <DialogLogin>
                  <Button
                    variant="ghost"
                    className="whitespace-nowrap text-base hover:text-destructive"
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
            ) : null}
            <div className="hidden lg:block">
              {pathname === '/search' ? (
                <SearchButton aiTag={!!hiveSense} />
              ) : (
                <ModeSwitchInput aiAvailable={!!hiveSense} />
              )}
            </div>
            <SearchButton aiTag={!!hiveSense} className="lg:hidden" />
            <TooltipContainer title={t('navigation.main_nav_bar.create_post')}>
              {user?.isLoggedIn ? (
                <Link href="/submit.html">
                  <Button variant="ghost" size="sm" className="h-10 w-10 px-0" data-testid="nav-pencil">
                    <Icons.pencil className="h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <DialogLogin redirectTo="/submit.html">
                  <Button variant="ghost" size="sm" className="h-10 w-10 px-0" data-testid="nav-pencil">
                    <Icons.pencil className="h-5 w-5" />
                  </Button>
                </DialogLogin>
              )}
            </TooltipContainer>
            {!isClient ? (
              <Skeleton className="h-10 w-10 rounded" />
            ) : !user?.isLoggedIn ? (
              <>
                {/* Mobile login icon - visible only on xs screens */}
                <DialogLogin>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 px-0 sm:hidden"
                    data-testid="login-btn-mobile"
                  >
                    <Icons.user className="h-5 w-5" />
                    <span className="sr-only">{t('navigation.main_nav_bar.login')}</span>
                  </Button>
                </DialogLogin>
                {/* Theme toggle - hidden on mobile */}
                <div className="hidden sm:block">
                  <ModeToggle>
                    <Button variant="ghost" size="sm" className="h-10 w-full px-2" data-testid="theme-mode">
                      <Icons.sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Icons.moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span className="hidden">Theme</span>
                    </Button>
                  </ModeToggle>
                </div>
              </>
            ) : null}
            {!isClient && !user?.isLoggedIn ? (
              <Skeleton className="h-9 w-9 rounded-full hidden sm:block" />
            ) : !user?.isLoggedIn ? (
              <div className="hidden sm:block">
                <LangToggle logged={user ? user?.isLoggedIn : false} className="px-2" />
              </div>
            ) : null}

            {!isClient ? (
              <Skeleton className="h-9 w-9 rounded-full" />
            ) : (
              <>
                {user.isLoggedIn ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger data-testid="profile-avatar-button" className="cursor-pointer">
                        <UserMenu user={user} notifications={data?.unread}>
                          <div className="group relative inline-flex w-fit cursor-pointer items-center justify-center">
                            {data && data.unread !== 0 ? (
                              <div className="absolute bottom-auto left-auto right-0 top-0.5 z-50 inline-block -translate-y-1/2 translate-x-2/4 rotate-0 skew-x-0 skew-y-0 scale-x-100 scale-y-100 whitespace-nowrap rounded-full bg-destructive-icon px-1.5 py-1 text-center align-baseline text-xs font-bold leading-none text-white">
                                {data.unread}
                              </div>
                            ) : null}
                            {/* Default state: RC ring only */}
                            <ManabarRing
                              percentage={rcPercent}
                              color="#0088FE"
                              size={48}
                              thickness={6}
                              className="absolute z-20 group-hover:invisible group-hover:delay-300 group-hover:duration-300 group-hover:animate-out group-hover:zoom-out-75"
                            />

                            {/* Hover state: Three concentric rings */}
                            <ManabarRing
                              percentage={downvotePercent}
                              color="#C01000"
                              size={43}
                              thickness={3.5}
                              className="invisible absolute z-20 group-hover:visible group-hover:delay-300 group-hover:duration-300 group-hover:animate-in group-hover:zoom-in-50"
                            />
                            <ManabarRing
                              percentage={upvotePercent}
                              color="#00C040"
                              size={50}
                              thickness={3.5}
                              className="invisible absolute z-10 group-hover:visible group-hover:delay-300 group-hover:duration-300 group-hover:animate-in group-hover:zoom-in-50"
                            />
                            <ManabarRing
                              percentage={rcPercent}
                              color="#0088FE"
                              size={57}
                              thickness={3.5}
                              className="invisible absolute group-hover:visible group-hover:delay-300 group-hover:duration-300 group-hover:animate-in group-hover:zoom-in-50"
                            />
                            <Avatar className="z-30 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full">
                              <AvatarImage
                                className="h-full w-full object-cover"
                                src={getUserAvatarUrl(user?.username || '', 'small')}
                                alt="Profile picture"
                              />
                              <AvatarFallback>
                                <img
                                  className="h-full w-full object-cover"
                                  src={getUserAvatarUrl(user?.username || '', 'small')}
                                  alt="Profile picture"
                                />
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </UserMenu>
                      </TooltipTrigger>
                      {manabarsData && (
                        <TooltipContent className="flex flex-col bg-background-tertiary">
                          <span>Resource Credits</span>
                          <div className="flex flex-col text-blue-600">
                            <span>(RC) level: {manabarsData.rc.percentageValue}%</span>
                            {manabarsData.rc.percentageValue !== 100 ? (
                              <span>Full in: {hoursAndMinutes(manabarsData.rc.cooldown, t)}</span>
                            ) : null}
                          </div>
                          <div className="flex flex-col text-green-600">
                            <span> Voting Power: {manabarsData.upvote.percentageValue}%</span>
                            {manabarsData?.upvote.percentageValue !== 100 ? (
                              <span>Full in: {hoursAndMinutes(manabarsData.upvote.cooldown, t)}</span>
                            ) : null}
                          </div>
                          <div className="flex flex-col text-destructive">
                            <span> Downvote power: {manabarsData.downvote.percentageValue}%</span>
                            {manabarsData.downvote.percentageValue !== 100 ? (
                              <span>Full in: {hoursAndMinutes(manabarsData.downvote.cooldown, t)}</span>
                            ) : null}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
              </>
            )}

            <Sidebar />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default MainBar;
