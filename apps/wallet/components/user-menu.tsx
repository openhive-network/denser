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
import ThemeSubmenu from './theme-submenu';
import { Link } from '@hive/ui';
import { Icons } from '@ui/components/icons';
import LangSubmenu from './lang-submenu';
import { useLogout } from '@smart-signer/lib/auth/use-logout';
import env from '@beam-australia/react-env';
import { getLogger } from '@ui/lib/logging';
import { KeyType, User } from '@smart-signer/types/common';
import { useTranslation } from '@/wallet/i18n/client';
import { Tooltip, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useDismissOnPointerDownOutside } from '@ui/hooks/use-dismiss-on-pointer-down-outside';
import DialogLogin from './dialog-login';
import LoginKeyAction from './login-key-action';
import { useLoginAuthorityLabels } from './use-login-authority-labels';
import { useAddSafeStorageKey } from '@smart-signer/lib/auth/use-add-safe-storage-key';

const logger = getLogger('app');

/**
 * The header's account menu. `children` is its trigger: a single focusable element (a `<button>`)
 * that opens the menu and shows `tooltip` (a `TooltipContent`) on hover and focus.
 */
const UserMenu = ({ children, user, tooltip }: { children: ReactNode; user: User; tooltip?: ReactNode }) => {
  const onLogout = useLogout('/');
  const blogHost = env('BLOG_DOMAIN');
  const { t } = useTranslation('common_wallet');
  const { authority, chip } = useLoginAuthorityLabels(user);
  const addKey = useAddSafeStorageKey(user);
  const [isKeyLoginOpen, setIsKeyLoginOpen] = useState(false);
  // Kept when the dialog closes, so its content does not change while it animates out
  const [keyLoginType, setKeyLoginType] = useState<KeyType>(KeyType.active);
  const openKeyLogin = useCallback((keyType: KeyType) => {
    setKeyLoginType(keyType);
    setIsKeyLoginOpen(true);
  }, []);
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
        <DropdownMenuContent className="w-56 " {...menuPress}>
          <DropdownMenuLabel className="flex w-full items-center justify-between">
            <div className="flex flex-col items-start gap-1">
              <span>{user.username}</span>
              <span
                className="rounded-full border px-2 py-0.5 text-xs font-normal text-muted-foreground"
                data-testid="login-authority-chip"
              >
                {chip}
              </span>
            </div>
            <Icons.walletlogo className=" w-20" />
          </DropdownMenuLabel>
          <LoginKeyAction authority={authority} onSwitchKey={openKeyLogin} onAddKey={addKey} />

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <Link href={`/@${user.username}/transfers`}>
              <DropdownMenuItem className="flex w-full cursor-pointer items-center">
                <Icons.wallet className="mr-2" />
                <span className="w-full">{t('navigation.user_menu.wallet')}</span>
              </DropdownMenuItem>
            </Link>
            {/* The link itself is the menu item, so Enter on it follows the link */}
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link
                target="_blank"
                href={`${blogHost}/@${user.username}`}
                className="flex w-full items-center"
                data-testid="user-menu-blog-link"
              >
                <Icons.post className="mr-2" />
                <span className="w-full">{t('navigation.user_menu.blog')}</span>
              </Link>
            </DropdownMenuItem>
            <ThemeSubmenu />
            <LangSubmenu />

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
      {/* Outside the menu, which unmounts its content when it closes */}
      <DialogLogin
        open={isKeyLoginOpen}
        onOpenChange={setIsKeyLoginOpen}
        username={user.username}
        keyType={keyLoginType}
      />
    </>
  );
};
export default UserMenu;
