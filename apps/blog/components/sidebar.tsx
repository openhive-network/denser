import { Button } from '@ui/components/button';
import { Icons } from '@ui/components/icons';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@ui/components/sheet';
import Link from 'next/link';
import { Separator } from '@ui/components/separator';
import clsx from 'clsx';
import { ReactNode } from 'react';
import { useTranslation } from 'next-i18next';
import env from '@beam-australia/react-env';
import DialogLogin from './dialog-login';
import { getLogger } from '@ui/lib/logging';
import { useUser } from '@smart-signer/lib/auth/use-user';
import version from '../version.json';
import { siteConfig } from '@ui/config/site';

const Item = ({
  href,
  children,
  target = false
}: {
  href: string;
  children: ReactNode;
  target?: boolean;
}) => {
  return (
    <li className="cursor-pointer border-b-2 border-white text-foreground hover:border-red-600 hover:bg-slate-100 dark:border-slate-950 dark:hover:border-red-600 dark:hover:bg-slate-900">
      <Link href={href} target={clsx(target ? '_blank' : '')}>
        <SheetClose className="flex h-full w-full items-center gap-1 p-4 text-sm font-semibold">
          {children}
        </SheetClose>
      </Link>
    </li>
  );
};
const logger = getLogger('app');

const Sidebar = () => {
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const walletHost = env('WALLET_ENDPOINT');
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-10 w-10 px-0" data-testid="nav-sidebar-menu-button">
          <Icons.sidebarOpen className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        position="right"
        size="sm"
        className="w-5/6 overflow-auto px-0 pt-12 md:w-2/6"
        data-testid="nav-sidebar-menu-content"
      >
        <div className="flex flex-col">
          <ul className="flex flex-col">
            {!user?.isLoggedIn && (
              <li className="cursor-pointer border-b-2 border-white text-foreground hover:border-red-600 hover:bg-slate-100 dark:border-slate-950 dark:hover:border-red-600 dark:hover:bg-slate-900 sm:hidden">
                <DialogLogin>
                  <div className="flex h-full w-full items-center gap-1 p-4 text-sm font-semibold">
                    {t('navigation.main_nav_bar.login')}
                  </div>
                </DialogLogin>
              </li>
            )}
            {!user?.isLoggedIn && (
              <li className="cursor-pointer border-b-2 border-white text-foreground hover:border-red-600 hover:bg-slate-100 dark:border-slate-950 dark:hover:border-red-600 dark:hover:bg-slate-900 sm:hidden">
                <Link href="https://signup.hive.io/" target="_blank">
                  <SheetClose className="flex h-full w-full items-center gap-1 p-4 text-sm font-semibold">
                    {t('navigation.main_nav_bar.sign_up')}
                    <Icons.forward className="w-4" />
                  </SheetClose>
                </Link>
              </li>
            )}
            {!user?.isLoggedIn && <Separator className="my-2 sm:hidden" />}
            <Item href="/welcome">{t('navigation.sidebar.welcome')}</Item>
            <Item href="/faq.html">{t('navigation.sidebar.faq')}</Item>
            <Item href="https://hiveblocks.com" target>
              Block Explorer
              <Icons.forward className="w-4" />
            </Item>
            <Separator className="my-2" />
            <Item href={`${walletHost}/recover_account_step_1`} target>
              {t('navigation.sidebar.stolen_account_recovery')}
              <Icons.forward className="w-4" />
            </Item>
            <Item href={`${walletHost}/change_password`} target>
              {t('navigation.sidebar.change_account_password')}
              <Icons.forward className="w-4" />
            </Item>
            <Item href={`${walletHost}/~witnesses`} target>
              {t('navigation.sidebar.vote_for_witnesses')}
              <Icons.forward className="w-4" />
            </Item>
            <Item href={`${walletHost}/proposals`} target>
              {t('navigation.sidebar.hive_proposals')}
              <Icons.forward className="w-4" />
            </Item>
            <Separator className="my-2" />
            <Item href={siteConfig.openhiveChatUri} target>
              {t('navigation.sidebar.openhive_chat')} <Icons.forward className="w-4" />
            </Item>
            <Separator className="my-2" />
            <Item href="https://developers.hive.io" target>
              {t('navigation.sidebar.developer_portal')} <Icons.forward className="w-4" />
            </Item>
            <Item href="https://hive.io/whitepaper.pdf" target>
              {t('navigation.sidebar.hive_whitepaper')} <Icons.forward className="w-4" />
            </Item>
            <Separator className="my-2" />
            <Item href="/privacy.html">{t('navigation.sidebar.privacy_policy')}</Item>
            <Item href="/tos.html">{t('navigation.sidebar.terms_of_service')}</Item>
            <span className="text-center text-xs font-light">Version: {version.commithash.slice(0, 8)}</span>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;
