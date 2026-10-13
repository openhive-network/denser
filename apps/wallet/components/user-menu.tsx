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
import { getLogger } from '@ui/lib/logging';
import { User } from '@smart-signer/types/common';
import { useTranslation } from '@/wallet/i18n/client';
import { Tooltip, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useDismissOnPointerDownOutside } from '@ui/hooks/use-dismiss-on-pointer-down-outside';

const logger = getLogger('app');

/**
 * The header's account menu. `children` is its trigger: a single focusable element (a `<button>`)
 * that opens the menu and shows `tooltip` (a `TooltipContent`) on hover and focus.
 */
const UserMenu = ({ children, user, tooltip }: { children: ReactNode; user: User; tooltip?: ReactNode }) => {
  const onLogout = useLogout('/');
  const { t } = useTranslation('common_wallet');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const menuPress = useDismissOnPointerDownOutside(isMenuOpen, closeMenu);

  // One element is both triggers, so keyboard activation, aria-haspopup/aria-expanded and focus
  // return all belong to the menu. The menu content stays outside the TooltipTrigger (React would
  // bubble its focus events through the portal and open the tooltip above the menu, where it takes
  // the first Esc), and the tooltip is held closed while the menu is open.
  return (
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
  );
};
export default UserMenu;
