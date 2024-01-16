import { Button } from '@hive/ui/components/button';
import { Icons } from '@hive/ui/components/icons';
import { FC } from 'react';
import Sidebar from './sidebar';
import { ModeToggle } from './mode-toggle';
import Link from 'next/link';
import DialogLogin from './dialog-login';
import { LangToggle } from '@/wallet/components/lang-toggle';
import { useTranslation } from 'next-i18next';
import { useLogout } from '@smart-signer/lib/auth/use-logout';
import { useUser } from '@smart-signer/lib/auth/use-user';

const SiteHeader: FC = () => {
  const { t } = useTranslation('common_wallet');
  const onLogout = useLogout();
  const { user } = useUser();

  return (
    <header className="supports-backdrop-blur:bg-background/60 sticky top-0 z-40 w-full border-b bg-background/95 shadow-sm backdrop-blur">
      <div className="container flex h-14 w-full items-center justify-between">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Icons.walletlogo className="w-32" />
        </Link>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <nav className="flex items-center space-x-1">
            {user && !user?.isLoggedIn ? (
              <div className="mx-1 hidden gap-1 sm:flex">
                <DialogLogin>
                  <Button variant="ghost" className="text-base hover:text-red-500">
                    {t('navigation.main_nav_bar.login')}
                  </Button>
                </DialogLogin>
                <Link href="https://signup.hive.io/">
                  <Button variant="redHover">{t('navigation.main_nav_bar.sign_up')}</Button>
                </Link>
              </div>
            ) : null}
            {user && user?.isLoggedIn ? (
              <Link
                href=""
                onClick={async (e) => {
                  e.preventDefault();
                  await onLogout();
                }}
                className="flex w-full items-center"
              >
                <Icons.doorOpen className="mr-2" />
                <span className="w-full">Logout</span>
              </Link>
            ) : null}
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
