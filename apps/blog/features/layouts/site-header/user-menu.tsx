import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@ui/components/dropdown-menu';
import { ReactNode, useCallback, useState } from 'react';
import ModeToggle from '../mode-toggle';
import { Link } from '@hive/ui';
import BasePathLink from '../../../components/base-path-link';
import { Icons } from '@ui/components/icons';
import { Button } from '@ui/components';
import LangToggle from '../lang-toggle';
import { useLogout } from '@smart-signer/lib/auth/use-logout';
import env from '@beam-australia/react-env';
import { User } from '@smart-signer/types/common';
import { useTranslation } from '@/blog/i18n/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useDismissOnPointerDownOutside } from '@ui/hooks/use-dismiss-on-pointer-down-outside';
import DialogLogin from '@/blog/components/dialog-login';
import AccountSwitcher from './account-switcher';
import LoginMethodIcon from './login-method-icon';

/**
 * The header's account menu. `children` is its trigger: a single focusable element (a `<button>`)
 * that opens the menu and shows `tooltip` (a `TooltipContent`) on hover and focus.
 */
const UserMenu = ({
  children,
  user,
  notifications,
  tooltip
}: {
  children: ReactNode;
  user: User;
  notifications?: number;
  tooltip?: ReactNode;
}) => {
  const onLogout = useLogout();
  const walletHost = env('WALLET_ENDPOINT');
  const { t } = useTranslation('common_blog');
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const openAddAccount = useCallback(() => setIsAddAccountOpen(true), []);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const menuPress = useDismissOnPointerDownOutside(isMenuOpen, closeMenu);

  // One element is both triggers, so keyboard activation, aria-haspopup/aria-expanded and focus
  // return all belong to the menu. The menu content stays outside the TooltipTrigger (React would
  // bubble its focus events through the portal and open the tooltip above the menu, where it takes
  // the first Esc), and the tooltip is held closed while the menu is open.
  return (
    <>
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <TooltipProvider>
          <Tooltip open={isTooltipOpen && !isMenuOpen} onOpenChange={setIsTooltipOpen}>
            <DropdownMenuTrigger asChild {...menuPress}>
              <TooltipTrigger asChild>{children}</TooltipTrigger>
            </DropdownMenuTrigger>
            {tooltip}
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent
          className="w-56 bg-background-secondary"
          data-testid="user-profile-menu-content"
          {...menuPress}
        >
          <DropdownMenuLabel className="flex w-full items-center justify-between">
            <span data-testid="user-name-in-profile-menu">{user.username}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="flex items-center space-x-2"
                    data-testid="login-method-indicator"
                  >
                    <LoginMethodIcon loginType={user.loginType} />
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

          <AccountSwitcher user={user} onAddAccount={openAddAccount} />

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
            <DropdownMenuItem className="cursor-pointer">
              <ModeToggle withTooltip={false}>
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
      {/* Outside the menu, which unmounts its content when it closes */}
      <DialogLogin open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen} />
    </>
  );
};
export default UserMenu;
