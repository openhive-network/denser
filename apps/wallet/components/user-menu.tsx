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
import { getLogger } from '@ui/lib/logging';
import { User } from '@smart-signer/types/common';
import { useTranslation } from 'next-i18next';

const logger = getLogger('app');

const UserMenu = ({ children, user }: { children: ReactNode; user: User }) => {
  const onLogout = useLogout();
  const { t } = useTranslation('common_wallet');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 ">
        <DropdownMenuLabel className="flex w-full items-center justify-between">
          <span>{user.username}</span>
          <Icons.walletlogo className=" w-20" />
        </DropdownMenuLabel>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href={`/@${user.username}/transfers`}>
            <DropdownMenuItem className="flex w-full cursor-pointer items-center">
              <Icons.wallet className="mr-2" />
              <span className="w-full">{t('navigation.user_menu.wallet')}</span>
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

          <Link href={`/@${user.username}/password`}>
            <DropdownMenuItem className="flex w-full cursor-pointer items-center">
              <Icons.keyRound className="mr-2" />
              <span className="w-full">{t('navigation.user_menu.change_password')}</span>
            </DropdownMenuItem>
          </Link>
          <Link href={`/@${user.username}/settings`}>
            <DropdownMenuItem className="flex w-full cursor-pointer items-center">
              <Icons.settings className="mr-2" />
              <span className="w-full">{t('navigation.user_menu.settings')}</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem className="cursor-pointer">
            <Link
              href=""
              onClick={async (e) => {
                e.preventDefault();
                await onLogout();
              }}
              className="flex w-full items-center"
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
