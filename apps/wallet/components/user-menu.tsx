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
import { Link } from '@hive/ui';
import { Icons } from '@ui/components/icons';
import { useLogout } from '@smart-signer/lib/auth/use-logout';
import { getLogger } from '@ui/lib/logging';
import { User, LoginType } from '@smart-signer/types/common';
import { useTranslation } from '@/wallet/i18n/client';

const logger = getLogger('app');

const UserMenu = ({ children, user }: { children: ReactNode; user: User }) => {
  const onLogout = useLogout('/');
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
          {user.loginType === LoginType.google && (
            <Link href={`/@${user.username}/settings/google-drive-wallet`}>
              <DropdownMenuItem className="flex w-full cursor-pointer items-center">
                <Icons.google className="mr-2 h-4 w-4" />
                <span className="w-full">{t('navigation.user_menu.google_drive_wallet')}</span>
              </DropdownMenuItem>
            </Link>
          )}
          <Link href={`/@${user.username}/settings`}>
            <DropdownMenuItem className="flex w-full cursor-pointer items-center">
              <Icons.settings className="mr-2" />
              <span className="w-full">{t('navigation.user_menu.settings')}</span>
            </DropdownMenuItem>
          </Link>
          <Link href={`/@${user.username}/password`}>
            <DropdownMenuItem className="flex w-full cursor-pointer items-center">
              <Icons.keyRound className="mr-2" />
              <span className="w-full">{t('navigation.user_menu.change_password')}</span>
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
