import { Button } from '@ui/components/button';
import { Icons } from '@ui/components/icons';
import { FC, useState, useEffect } from 'react';
import Sidebar from './sidebar';
import ModeToggle from './mode-toggle';
import Link from 'next/link';
import DialogLogin from './dialog-login';
import LangToggle from '@/wallet/components/lang-toggle';
import { useTranslation } from 'next-i18next';
import { useLogout } from '@smart-signer/lib/auth/use-logout';
import { getLogger } from '@ui/lib/logging';
import { useUser } from '@smart-signer/lib/auth/use-user';
import UserMenu from './user-menu';
import { PieChart, Pie } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/components';
import { useQuery } from '@tanstack/react-query';
import { findRcAccounts } from '../lib/hive';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@hive/ui/components/tooltip';
import { RcAccount } from '@hiveio/wax';
import { siteConfig } from '@ui/config/site';

const logger = getLogger('app');

const calculateRcStats = (userRc: RcAccount[]) => {
  const manaRegenerationTime = 432000;
  const currentTime = parseInt((new Date().getTime() / 1000).toFixed(0));
  const stats = {
    resourceCreditsPercent: 0,
    resourceCreditsWaitTime: 0
  };

  const maxRcMana = parseFloat(String(userRc[0].max_rc));
  const rcManaElapsed = currentTime - userRc[0].rc_manabar.last_update_time;
  let currentRcMana =
    parseFloat(String(userRc[0].rc_manabar.current_mana)) +
    (rcManaElapsed * maxRcMana) / manaRegenerationTime;
  if (currentRcMana > maxRcMana) {
    currentRcMana = maxRcMana;
  }
  stats.resourceCreditsPercent = Math.round((currentRcMana * 100) / maxRcMana);
  stats.resourceCreditsWaitTime = ((100 - stats.resourceCreditsPercent) * manaRegenerationTime) / 100;

  return stats;
};
const SiteHeader: FC = () => {
  const { t } = useTranslation('common_wallet');
  const { user } = useUser();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  const {
    data: rcData,
    isLoading: rcLoading,
    isError: rcError
  } = useQuery([['findRcAcconut', user?.username]], () => findRcAccounts(user?.username || ''), {
    enabled: !!user?.username
  });
  const stats = rcData
    ? calculateRcStats(rcData.rc_accounts)
    : {
        resourceCreditsPercent: 0,
        resourceCreditsWaitTime: 0
      };
  const chartAngle = (360 * stats.resourceCreditsPercent) / 100;
  const chart = [{ name: '', value: 1 }];
  return (
    <header className="supports-backdrop-blur:bg-background/60 sticky top-0 z-40 w-full border-b bg-background/95 shadow-sm backdrop-blur">
      <div className="container flex h-14 w-full items-center justify-between">
        <Link href="/" className="keychainify-checked mr-6 flex items-center space-x-2">
          <Icons.walletlogo className="w-32" />
          {siteConfig.chainEnv !== 'mainnet' && <span className="text-xs text-red-600 uppercase" data-testid="type-of-api-endpoint">{siteConfig.chainEnv}</span>}
        </Link>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <nav className="flex items-center space-x-1">
            {isClient && user && !user?.isLoggedIn ? (
              <div className="mx-1 hidden gap-1 sm:flex">
                <DialogLogin>
                  <Button variant="ghost" className="whitespace-nowrap text-base hover:text-red-500">
                    {t('navigation.main_nav_bar.login')}
                  </Button>
                </DialogLogin>
                <Link href="https://signup.hive.io/">
                  <Button variant="redHover" className="whitespace-nowrap">
                    {t('navigation.main_nav_bar.sign_up')}
                  </Button>
                </Link>
              </div>
            ) : null}
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
                  <TooltipTrigger data-testid="profile-avatar-button">
                    <UserMenu user={user}>
                      <div className="relative inline-flex w-fit cursor-pointer items-center justify-center">
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
