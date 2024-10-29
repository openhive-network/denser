import { hoursAndMinutes } from '@/blog/lib/utils';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useQuery } from '@tanstack/react-query';
import { getUnreadNotifications } from '@transaction/lib/bridge';
import {
  Button,
  TooltipProvider,
  TooltipTrigger,
  Avatar,
  AvatarImage,
  AvatarFallback,
  TooltipContent,
  Tooltip
} from '@ui/components';
import { Icons } from '@ui/components/icons';
import { siteConfig } from '@ui/config/site';
import clsx from 'clsx';
import { PieChart } from 'lucide-react';

import { useTranslation } from 'next-i18next';

import React, { useState, KeyboardEvent, FC, useEffect } from 'react';
import { Pie } from 'recharts';
import DialogLogin from '../dialog-login';
import useManabars from '../hooks/useManabars';
import LangToggle from '../lang-toggle';
import { MainNav } from '../main-nav';
import ModeToggle from '../mode-toggle';
import UserMenu from '../user-menu';
import Link from 'next/link';
import Sidebar from '../sidebar';
import { useRouter } from 'next/navigation';

const SiteHeader: FC = () => {
  const router = useRouter();
  const { t } = useTranslation('common_blog');

  const { user } = useUser();
  const { manabarsData } = useManabars(user.username);
  const { data, isLoading, isError } = useQuery(
    ['unreadNotifications', user.username],
    () => getUnreadNotifications(user.username),
    {
      enabled: !!user.username
    }
  );
  const upvoteAngle = (360 * (manabarsData ? manabarsData?.upvote.percentageValue : 0)) / 100;
  const downvoteAngle = (360 * (manabarsData ? manabarsData?.downvote.percentageValue : 0)) / 100;
  const rcAngle = (360 * (manabarsData ? manabarsData?.rc.percentageValue : 0)) / 100;
  const chart = [{ name: '', value: 1 }];
  const [input, setInput] = useState('');
  const handleEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      router.push(`/search?q=${encodeURIComponent(input)}&s=newest`);
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
          <span className="font-bold sm:inline-block">{siteConfig.name}</span>
          {siteConfig.chainEnv !== 'mainnet' && (
            <span className="text-xs uppercase text-destructive">{siteConfig.chainEnv}</span>
          )}
        </Link>

        <MainNav />
        <div className="flex items-center space-x-2 sm:space-x-4">
          <nav className="flex items-center space-x-1">
            {/* {user.isLoggedIn ? null : (
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
            )} */}
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
            {/* {!user.isLoggedIn ? (
              <ModeToggle>
                <Button variant="ghost" size="sm" className="h-10 w-full px-0" data-testid="theme-mode">
                  <Icons.sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Icons.moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="hidden">Toggle theme</span>
                </Button>
              </ModeToggle>
            ) : null} */}
            {/* {!user.isLoggedIn ? <LangToggle logged={user ? user?.isLoggedIn : false} /> : null} */}
            {/* {user.isLoggedIn ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger data-testid="profile-avatar-button" className="cursor-pointer">
                    <UserMenu user={user} notifications={data?.unread}>
                      <div className="group relative inline-flex w-fit cursor-pointer items-center justify-center">
                        {data && data.unread !== 0 ? (
                          <div className="absolute bottom-auto left-auto right-0 top-0.5 z-50 inline-block -translate-y-1/2 translate-x-2/4 rotate-0 skew-x-0 skew-y-0 scale-x-100 scale-y-100 whitespace-nowrap rounded-full bg-destructive px-1.5 py-1 text-center align-baseline text-xs font-bold leading-none text-white">
                            {data.unread}
                          </div>
                        ) : null}
                        <div className="absolute z-20 group-hover:invisible group-hover:delay-300 group-hover:duration-300 group-hover:animate-out group-hover:zoom-out-75">
                          <PieChart width={50} height={50}>
                            <Pie
                              data={chart}
                              cx={20}
                              cy={20}
                              startAngle={90}
                              endAngle={-rcAngle + 90}
                              innerRadius={18}
                              outerRadius={24}
                              fill="#0088FE"
                              paddingAngle={0}
                              dataKey="value"
                            ></Pie>
                          </PieChart>
                        </div>

                        <div className="invisible absolute z-20 group-hover:visible group-hover:delay-300 group-hover:duration-300 group-hover:animate-in group-hover:zoom-in-50">
                          <PieChart width={50} height={50}>
                            <Pie
                              data={chart}
                              cx={20}
                              cy={20}
                              startAngle={90}
                              endAngle={-downvoteAngle + 90}
                              innerRadius={18}
                              outerRadius={21.5}
                              fill="#C01000"
                              paddingAngle={0}
                              dataKey="value"
                            ></Pie>
                          </PieChart>
                        </div>
                        <div className="invisible absolute z-10 group-hover:visible group-hover:delay-300 group-hover:duration-300 group-hover:animate-in group-hover:zoom-in-50">
                          <PieChart width={60} height={60}>
                            <Pie
                              data={chart}
                              cx={25}
                              cy={25}
                              startAngle={90}
                              endAngle={-upvoteAngle + 90}
                              innerRadius={21.5}
                              outerRadius={25}
                              fill="#00C040"
                              paddingAngle={0}
                              dataKey="value"
                            ></Pie>
                          </PieChart>
                        </div>
                        <div className="invisible absolute group-hover:visible group-hover:delay-300 group-hover:duration-300 group-hover:animate-in group-hover:zoom-in-50">
                          <PieChart width={70} height={70}>
                            <Pie
                              data={chart}
                              cx={30}
                              cy={30}
                              startAngle={90}
                              endAngle={-rcAngle + 90}
                              innerRadius={25}
                              outerRadius={28.5}
                              fill="#0088FE"
                              paddingAngle={0}
                              dataKey="value"
                            ></Pie>
                          </PieChart>
                        </div>
                        <Avatar className="z-30 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full">
                          <AvatarImage
                            className="h-full w-full object-cover"
                            src={user.avatarUrl}
                            alt="Profile picture"
                          />
                          <AvatarFallback>
                            <img
                              className="h-full w-full object-cover"
                              src="https://images.hive.blog/DQmb2HNSGKN3pakguJ4ChCRjgkVuDN9WniFRPmrxoJ4sjR4"
                              alt="default img"
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
            ) : null} */}
            <Sidebar />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
