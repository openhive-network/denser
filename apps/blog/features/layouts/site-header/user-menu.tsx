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
import BasePathLink from '../../../components/base-path-link';
import { Icons } from '@ui/components/icons';
import { useLogout } from '@smart-signer/lib/auth/use-logout';
import env from '@beam-australia/react-env';
import { User, LoginType } from '@smart-signer/types/common';
import { useTranslation } from '@/blog/i18n/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';

// Helper function to get login method icon
const getLoginMethodIcon = (loginType: LoginType) => {
  switch (loginType) {
    case LoginType.google:
      return <Icons.google className="h-4 w-4" />;
    case LoginType.keychain:
      return <Icons.hivekeychain className="h-4 w-4" />;
    case LoginType.peakvault:
      return <Icons.peakvault className="h-4 w-4" />;
    case LoginType.metamask:
      return <Icons.metamask className="h-4 w-4" />;
    case LoginType.hiveauth:
      return <Icons.hiveauth className="h-4 w-4" />;
    case LoginType.hivesigner:
      return <Icons.hivesigner className="h-4 w-4" />;
    case LoginType.hbauth:
    case LoginType.wif:
    default:
      return <Icons.keyRound className="h-4 w-4" />;
  }
};

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
  const walletHost = env('WALLET_ENDPOINT');
  const { t } = useTranslation('common_blog');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-background-secondary" data-testid="user-profile-menu-content">
        <DropdownMenuLabel className="flex w-full items-center justify-between">
          <span data-testid="user-name-in-profile-menu">{user.username}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center space-x-2"
                  data-testid="login-method-indicator"
                >
                  {getLoginMethodIcon(user.loginType)}
                  <div className="flex flex-col text-sm font-semibold">
                    <span>Hive</span>
                    <span className="text-destructive">Blog</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {t('navigation.user_menu.logged_in_with', {
                    method: t(`navigation.user_menu.login_method.${user.loginType}`)
                  })}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <BasePathLink href={`/@${user.username}`} data-testid="user-profile-menu-profile-link">
            <DropdownMenuItem className="cursor-pointer">
              <Icons.user className="mr-2" />
              <span className="w-full">{t('navigation.user_menu.profile')}</span>
            </DropdownMenuItem>
          </BasePathLink>
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
          {user.loginType === LoginType.google && (
            <BasePathLink
              href={`/@${user.username}/settings/google-drive-wallet`}
              data-testid="user-profile-menu-google-drive-wallet-link"
            >
              <DropdownMenuItem className="cursor-pointer">
                <Icons.google className="mr-2 h-4 w-4" />
                <span className="w-full">{t('navigation.user_menu.google_drive_wallet')}</span>
              </DropdownMenuItem>
            </BasePathLink>
          )}
          <BasePathLink href={`/@${user.username}/settings`} data-testid="user-profile-menu-settings-link">
            <DropdownMenuItem className="cursor-pointer">
              <Icons.settings className="mr-2" />
              <span className="w-full">{t('navigation.user_menu.settings')}</span>
            </DropdownMenuItem>
          </BasePathLink>
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
