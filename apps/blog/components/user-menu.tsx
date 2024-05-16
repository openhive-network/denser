import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@ui/components/dropdown-menu';
import { ReactNode } from 'react';
import ModeToggle from './mode-toggle';
import Link from 'next/link';
import { Icons } from '@ui/components/icons';
import { Button } from '@ui/components';
import LangToggle from './lang-toggle';
import { useLogout } from '@smart-signer/lib/auth/use-logout';
import { AppConfigService } from '@/blog/lib/app-config/app-config-service';
import { User } from '@smart-signer/types/common';
import { useTranslation } from 'next-i18next';

const UserMenu = ({
  children,
  user,
  notifications
}: {
  children: ReactNode;
  user: User;
  notifications?: number;
}) => {
  const onLogout = useLogout();
  const walletHost = AppConfigService.config.wallet_endpoint;
  const { t } = useTranslation('common_blog');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 " data-testid="user-profile-menu-content">
        <DropdownMenuLabel className="flex w-full items-center justify-between">
          <span data-testid="user-name-in-profile-menu">{user.username}</span>
          <div className="flex items-center space-x-2" title="Logged in with Hive private key">
            <Icons.hive className="h-4 w-4" />
            <div className="flex flex-col text-sm font-semibold">
              <span>Hive</span>
              <span className="text-red-600">Blog</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href={`/@${user.username}`} data-testid="user-profile-menu-profile-link">
            <DropdownMenuItem className="cursor-pointer">
              <Icons.user className="mr-2" />
              <span className="w-full">{t('navigation.user_menu.profile')}</span>
            </DropdownMenuItem>
          </Link>
          <Link href={`/@${user.username}/notifications`} data-testid="user-profile-menu-notifications-link">
            <DropdownMenuItem className="cursor-pointer">
              <Icons.clock className="mr-2" />
              <span className="w-full">
                {t('navigation.user_menu.notifications')}
                {notifications ? `(${notifications})` : null}
              </span>
            </DropdownMenuItem>
          </Link>
          <Link href={`/@${user.username}/comments`} data-testid="user-profile-menu-comments-link">
            <DropdownMenuItem className="cursor-pointer">
              <Icons.comment className="mr-2" />
              <span className="w-full">{t('navigation.user_menu.comments')}</span>
            </DropdownMenuItem>
          </Link>
          <Link href={`/@${user.username}/replies`} data-testid="user-profile-menu-replies-link">
            <DropdownMenuItem className="cursor-pointer">
              <Icons.undo className="mr-2" />
              <span className="w-full">{t('navigation.user_menu.replies')}</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem className="cursor-pointer">
            <ModeToggle>
              <Button
                variant="ghost"
                size="sm"
                className="flex h-6 w-full p-0 text-start font-normal"
                data-testid="theme-mode"
              >
                <div className="h-6 w-8">
                  <Icons.sun className="absolute rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Icons.moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </div>
                <span className="w-full">{t('navigation.user_menu.toggle_theme')}</span>
              </Button>
            </ModeToggle>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <LangToggle logged={true} />
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Link
              target="_blank"
              href={`${walletHost}/@${user.username}/transfers`}
              className="flex w-full items-center"
              data-testid="user-profile-menu-wallet-link"
            >
              <Icons.wallet className="mr-2" />
              <span className="w-full">{t('navigation.user_menu.wallet')}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Link
              href=""
              onClick={async (e) => {
                e.preventDefault();
                await onLogout();
              }}
              className="flex w-full items-center"
              data-testid="user-profile-menu-logout-link"
            >
              <Icons.doorOpen className="mr-2" />
              <span className="w-full">{t('navigation.user_menu.logout')}</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
export default UserMenu;
