'use client';

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
import React, { useState, KeyboardEvent, FC, useEffect } from 'react';
import Link from 'next/link';
import { MainNav } from './main-nav';
import DialogLogin from '@/blog/components/dialog-login';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useTranslation } from '@/blog/i18n/client';
import Sidebar from './sidebar';
import ModeToggle from './mode-toggle';
import LangToggle from './lang-toggle';

const SiteHeader: FC = () => {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const [isNavHidden, setIsNavHidden] = useState(false);

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
            {user.isLoggedIn ? null : (
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
            )}
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
            {user.isLoggedIn ? null : (
              <>
                <ModeToggle>
                  <Button variant="ghost" size="sm" className="h-10 w-full px-0" data-testid="theme-mode">
                    <Icons.sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Icons.moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="hidden">Toggle theme</span>
                  </Button>
                </ModeToggle>
                <LangToggle logged={user.isLoggedIn} />
              </>
            )}

            <Sidebar />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
