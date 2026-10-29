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
import ThemeSubmenu from '../theme-submenu';
import { Link } from '@hive/ui';
import BasePathLink from '../../../components/base-path-link';
import { Icons } from '@ui/components/icons';
import LangSubmenu from '../lang-submenu';
import { useLogout } from '@smart-signer/lib/auth/use-logout';
import env from '@beam-australia/react-env';
import { KeyType, User } from '@smart-signer/types/common';
import { useTranslation } from '@/blog/i18n/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useDismissOnPointerDownOutside } from '@ui/hooks/use-dismiss-on-pointer-down-outside';
import DialogLogin from '@/blog/components/dialog-login';
import AccountSwitcher from './account-switcher';
import LoginMethodIcon from './login-method-icon';
import LoginKeyAction from './login-key-action';
import { useLoginAuthorityLabels } from './use-login-authority-labels';
import { useAddSafeStorageKey } from '@smart-signer/lib/auth/use-add-safe-storage-key';
import { usePathname } from 'next/navigation';
import { signOutDestination } from '@/blog/features/tags-pages/use-trending-on-sign-out';

/** What the login dialog opened from the menu signs in: any account, or this one with a given key */
type LoginDialogTarget = { username?: string; keyType?: KeyType };

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
  const pathname = usePathname();
  const walletHost = env('WALLET_ENDPOINT');
  const { t } = useTranslation('common_blog');
  const { authority, chip } = useLoginAuthorityLabels(user);
  const addKey = useAddSafeStorageKey(user);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  // Kept when the dialog closes, so its content does not change while it animates out
  const [loginTarget, setLoginTarget] = useState<LoginDialogTarget>({});
  const openAddAccount = useCallback(() => {
    setLoginTarget({});
    setIsLoginOpen(true);
  }, []);
  const openKeyLogin = useCallback(
    (keyType: KeyType) => {
      setLoginTarget({ username: user.username, keyType });
      setIsLoginOpen(true);
    },
    [user.username]
  );
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
            <div className="flex flex-col items-start gap-1">
              <span data-testid="user-name-in-profile-menu">{user.username}</span>
              <span
                className="rounded-full border px-2 py-0.5 text-xs font-normal text-muted-foreground"
                data-testid="login-authority-chip"
              >
                {chip}
              </span>
            </div>
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
          <LoginKeyAction authority={authority} onSwitchKey={openKeyLogin} onAddKey={addKey} />

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
            <ThemeSubmenu />
            <LangSubmenu />
            {/* The link itself is the menu item, so Enter on it follows the link */}
            <DropdownMenuItem className="cursor-pointer" asChild>
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
                  await onLogout(signOutDestination(pathname));
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
      <DialogLogin
        open={isLoginOpen}
        onOpenChange={setIsLoginOpen}
        username={loginTarget.username}
        keyType={loginTarget.keyType}
      />
    </>
  );
};
export default UserMenu;
